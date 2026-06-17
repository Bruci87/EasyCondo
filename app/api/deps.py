from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.sindico import Sindico

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user_id(request: Request) -> int:
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não autenticado"
        )
    return int(user_id)


def require_sindico(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> int:
    sindico = db.query(Sindico).filter(Sindico.id == user_id).first()
    if not sindico:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido apenas para síndico"
        )
    return user_id