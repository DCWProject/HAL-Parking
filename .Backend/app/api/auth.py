from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app import schemas, models
from app.core import security, config
from app.dependencies import get_db, get_current_admin
from app.schemas.response import ResponseModel
from app.core.response import create_response

router = APIRouter()


@router.post("/login", response_model=ResponseModel[dict])
def login_access_token(
    db: Annotated[Session, Depends(get_db)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
):
    admin = (
        db.query(models.Admin).filter(models.Admin.email == form_data.username).first()
    )
    if not admin or not security.verify_password(
        form_data.password, admin.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )
    access_token_expires = timedelta(
        minutes=config.settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    access_token = security.create_access_token(
        subject=admin.email, expires_delta=access_token_expires
    )

    response = create_response(
        data={"access_token": access_token}, message="Login Successful"
    )

    # Set HttpOnly Cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        # secure=True,  # Default to False for localhost/http. Set to True in prod.
        # samesite="strict",
        max_age=config.settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return response


@router.post("/logout", response_model=ResponseModel[None])
def logout():
    response = create_response(data=None, message="Logout Successful")
    response.delete_cookie(key="access_token")
    return response


@router.get("/me", response_model=ResponseModel[schemas.AdminResponse])
def read_users_me(current_admin: Annotated[models.Admin, Depends(get_current_admin)]):
    return create_response(data=current_admin, message="User fetched successfully")
