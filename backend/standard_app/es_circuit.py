"""Elasticsearch 熔断：探测失败或检索超时后跳过 ES，避免每次分页都等待超时。"""
import logging
import threading
import time

from django.conf import settings

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_es_attempt_lock = threading.Lock()
_es_skip_until = float('inf')  # 启动后先走 MySQL，后台探测完成再决定是否用 ES
_last_fallback_log_at = 0.0
_consecutive_failures = 0


def es_should_skip():
    with _lock:
        return time.monotonic() < _es_skip_until


def mark_es_available():
    with _lock:
        global _es_skip_until, _consecutive_failures
        _es_skip_until = 0.0
        _consecutive_failures = 0


def mark_es_unavailable(*, permanent=False):
    cooldown = getattr(settings, 'ES_CIRCUIT_COOLDOWN', 120)
    max_failures = getattr(settings, 'ES_CIRCUIT_MAX_FAILURES', 2)
    with _lock:
        global _es_skip_until, _consecutive_failures
        _consecutive_failures += 1
        if permanent or _consecutive_failures >= max_failures:
            _es_skip_until = float('inf')
        else:
            _es_skip_until = time.monotonic() + cooldown


def _log_fallback_once(exc):
    global _last_fallback_log_at
    cooldown = getattr(settings, 'ES_CIRCUIT_COOLDOWN', 120)
    with _lock:
        now = time.monotonic()
        if now - _last_fallback_log_at < cooldown:
            return
        _last_fallback_log_at = now
    logger.warning('Elasticsearch Search failed, fallback to MySQL: %s', exc)


def try_elasticsearch(callback):
    """
    在熔断未开启时执行 ES 查询；失败则打开熔断并仅记录一次告警。
    使用互斥锁避免并发分页/预取同时触发多次 ES 超时。
    """
    if not getattr(settings, 'USE_ELASTICSEARCH', True):
        return None
    if es_should_skip():
        return None

    with _es_attempt_lock:
        if es_should_skip():
            return None
        try:
            result = callback()
            mark_es_available()
            return result
        except Exception as exc:
            mark_es_unavailable()
            _log_fallback_once(exc)
            return None


def probe_elasticsearch(es_client):
    """后台探测：成功则启用 ES；失败则本进程内不再尝试 ES。"""
    if not getattr(settings, 'USE_ELASTICSEARCH', True):
        mark_es_unavailable(permanent=True)
        logger.info('Elasticsearch disabled (USE_ELASTICSEARCH=False), using MySQL only.')
        return

    try:
        if es_client.ping():
            mark_es_available()
            logger.info('Elasticsearch is available.')
        else:
            mark_es_unavailable(permanent=True)
            logger.warning(
                'Elasticsearch ping returned False, using MySQL only for this process.',
            )
    except Exception as exc:
        mark_es_unavailable(permanent=True)
        logger.warning(
            'Elasticsearch probe failed (%s), using MySQL only for this process.',
            exc,
        )
