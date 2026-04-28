import redis
import rq
from app.config import settings

_redis_conn = redis.from_url(settings.REDIS_URL)
_queue = rq.Queue("default", connection=_redis_conn)


def enqueue_process_upload(version_id: int) -> str:
    job = _queue.enqueue("worker.process_upload", version_id)
    return job.id
