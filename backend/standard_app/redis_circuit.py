import time
import logging
from django.core.cache import cache as django_cache

logger = logging.getLogger(__name__)

_redis_skip_until = 0.0
_COOLDOWN = 120  # Redis 连接失败后，冷却 120 秒不尝试连接

def safe_cache_get(key, default=None):
    global _redis_skip_until
    if time.monotonic() < _redis_skip_until:
        return default
    try:
        return django_cache.get(key, default)
    except Exception as e:
        _redis_skip_until = time.monotonic() + _COOLDOWN
        logger.warning("Redis connection failed, disabling cache for %d seconds: %s", _COOLDOWN, e)
        return default

def safe_cache_set(key, value, timeout=300):
    global _redis_skip_until
    if time.monotonic() < _redis_skip_until:
        return False
    try:
        django_cache.set(key, value, timeout)
        return True
    except Exception as e:
        _redis_skip_until = time.monotonic() + _COOLDOWN
        logger.warning("Redis connection failed, disabling cache for %d seconds: %s", _COOLDOWN, e)
        return False
