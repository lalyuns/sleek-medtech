from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ReferenceEdgeCreate(BaseModel):
    target_type: str  # old_version | feedback | report
    target_id: int


class ReferenceEdgeOut(BaseModel):
    edge_id: int
    source_version_id: int
    target_type: str
    target_id: int

    model_config = {"from_attributes": True}


class TraceNode(BaseModel):
    id: str
    type: str = "default"
    position: Dict[str, float]
    data: Dict[str, Any]
    style: Dict[str, Any]

    model_config = {"from_attributes": True}


class TraceEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    animated: bool = False
    style: Dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class TraceabilityOut(BaseModel):
    nodes: List[TraceNode]
    edges: List[TraceEdge]
