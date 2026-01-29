from typing import Any, Dict, List, Optional
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder


def create_response(
    data: Optional[Any] = None,
    message: str = "Success",
    status_code: int = 200,
    meta: Optional[Dict[str, Any]] = None,
    success: bool = True,
    errors: Optional[Dict[str, List[str]]] = None,
) -> JSONResponse:
    content = {
        "success": success,
        "status_code": status_code,
        "message": message,
        "data": jsonable_encoder(data) if data is not None else None,
        "meta": meta,
        "errors": errors,
    }
    return JSONResponse(content=content, status_code=status_code)


def error_response(
    message: str,
    status_code: int = 400,
    errors: Optional[Dict[str, List[str]]] = None,
) -> JSONResponse:
    if errors is None:
        # Default generic error structure if no specific field errors provided
        errors = {"non_field_errors": [message]}

    return create_response(
        success=False, status_code=status_code, message=message, errors=errors
    )
