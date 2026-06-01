from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.services import solicitacao_service
from app.services.solicitacao_service import listar, aprovar, negar
from app.api.deps import get_db
from typing import List
from app.schemas.user import UserResponse

router = APIRouter(prefix="/solicitacoes", tags=["Solicitações"])


@router.get("/", response_model=List[UserResponse])
def listar(db: Session = Depends(get_db)):
    return solicitacao_service.listar(db)

@router.put("/{id}/aprovar")
def aprovar(id: int, db: Session = Depends(get_db)):
    return solicitacao_service.aprovar(db, id)

@router.put("/{id}/negar")
def negar(id: int, db: Session = Depends(get_db)):
    return solicitacao_service.negar(db, id)