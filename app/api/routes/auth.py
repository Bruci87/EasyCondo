from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.schemas.solicitacao import SolicitacaoCreate
from app.services import auth_service
from app.api.deps import get_db
from app.schemas.login import LoginRequest

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
def register(data: SolicitacaoCreate, db: Session = Depends(get_db)):
    return auth_service.register(db, data)


@router.post("/login")
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    resultado = auth_service.login(db, data.email, data.senha)
    request.session["user_id"] = resultado["user_id"]
    request.session["is_sindico"] = resultado["is_sindico"]
    return resultado


@router.post("/sindico/login")
def login_sindico(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    resultado = auth_service.login_sindico(db, data.email, data.senha)
    request.session["user_id"] = resultado["user_id"]
    request.session["is_sindico"] = True
    return resultado


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"msg": "Logout realizado"}


@router.get("/me")
def me(request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        return {"authenticated": False}

    return {
        "authenticated": True,
        "user_id": int(user_id),
        "is_sindico": bool(request.session.get("is_sindico", False))
    }