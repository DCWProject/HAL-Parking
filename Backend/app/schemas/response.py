from typing import Generic, TypeVar, Optional, Any, Dict, List
from pydantic import BaseModel

T = TypeVar("T")


class ResponseModel(BaseModel, Generic[T]):
    success: bool
    status_code: int
    message: str
    data: Optional[T] = None
    meta: Optional[Dict[str, Any]] = None
    errors: Optional[Dict[str, List[str]]] = None
