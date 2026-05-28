from typing import Optional

from sqlalchemy.orm import Session

from app.models.event import Event


def record_event(
    db: Session,
    *,
    project_id: int,
    actor_id: Optional[int],
    event_type: str,
    summary: str,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    payload_json: Optional[dict] = None,
) -> Event:
    event = Event(
        project_id=project_id,
        actor_id=actor_id,
        event_type=event_type,
        target_type=target_type,
        target_id=target_id,
        summary=summary,
        payload_json=payload_json,
    )
    db.add(event)
    return event
