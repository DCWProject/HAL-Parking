from typing import Generator, Annotated
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core import database, config
from app import models, schemas

# Keeping OAuth2PasswordBearer for Swagger UI support, though technically we use cookies
# We can make it optional so it doesn't fail if header is missing, relying on cookie
reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{config.settings.API_V1_STR}/auth/login", auto_error=False
)


def get_db() -> Generator:
    try:
        db = database.SessionLocal()
        yield db
    finally:
        db.close()


SessionDep = Annotated[Session, Depends(get_db)]


def get_token(request: Request, token_header: str = Depends(reusable_oauth2)) -> str:
    # 1. Try to get from Cookie
    token = request.cookies.get("access_token")
    if token:
        # If it has "Bearer " prefix (unlikely for cookie but possible if set that way), strip it
        if token.startswith("Bearer "):
            token = token.split(" ")[1]
        return token

    # 2. Fallback to Header (Swagger UI)
    if token_header:
        return token_header

    return None


def get_current_admin(db: SessionDep, token: str = Depends(get_token)) -> models.Admin:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(
            token, config.settings.SECRET_KEY, algorithms=[config.settings.ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception

    admin = (
        db.query(models.Admin).filter(models.Admin.email == token_data.email).first()
    )
    if admin is None:
        raise credentials_exception
    return admin
