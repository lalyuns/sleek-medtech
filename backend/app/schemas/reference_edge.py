from typing import List, Optional
from pydantic import BaseModel


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
    version_id: int
    version_number: int
    status: str
    description: Optional[str]

    model_config = {"from_attributes": True}


class TraceEdge(BaseModel):
    source_version_id: int
    target_id: int
    target_type: str

    model_config = {"from_attributes": True}


class TraceabilityOut(BaseModel):
    nodes: List[TraceNode]
    edges: List[TraceEdge]
