from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Any, Dict


class DatasetCreate(BaseModel):
    name: str
    description: Optional[str] = None


class DatasetResponse(BaseModel):
    id: int
    name: str
    filename: str
    file_format: str
    rows: int
    columns: int
    column_names: Optional[List[str]] = None
    size_bytes: float
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DatasetPreview(BaseModel):
    columns: List[str]
    dtypes: Dict[str, str]
    head: List[Dict[str, Any]]
    stats: Dict[str, Any]
    shape: List[int]
