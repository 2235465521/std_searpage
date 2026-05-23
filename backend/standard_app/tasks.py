from celery import shared_task
from .services import submit_dify_task_sync

@shared_task(bind=True, max_retries=3)
def process_dify_evaluation_task(self, std_id_str, task_type, business_description=None):
    """
    Celery 异步任务：把耗时的 Dify 接口调用放入后台执行。
    支持自动重试机制。
    """
    try:
        # 直接调用 services.py 中的同步接口
        result = submit_dify_task_sync(std_id_str, task_type, business_description)
        
        if isinstance(result, dict) and "error" in result:
            raise Exception(f"Dify API returned error: {result['error']}")
            
        return result
        
    except Exception as exc:
        # 失败时每 10 秒重试一次，最多 3 次
        self.retry(exc=exc, countdown=10)
