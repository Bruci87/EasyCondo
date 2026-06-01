from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.status_usuario import StatusUsuario

from app.repositories import user_repository


def listar(db: Session):

    return user_repository.listar_pendentes(db)


def aprovar(
    db: Session,
    user_id: int
):

    user = user_repository.buscar_por_id(
        db,
        user_id
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado"
        )

    if user.status != StatusUsuario.pendente:
        raise HTTPException(
            status_code=400,
            detail="Usuário já processado"
        )

    user.status = StatusUsuario.aprovado

    user_repository.salvar(
        db,
        user
    )

    return {
        "msg": "Usuário aprovado"
    }


def negar(
    db: Session,
    user_id: int
):

    user = user_repository.buscar_por_id(
        db,
        user_id
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado"
        )

    if user.status != StatusUsuario.pendente:
        raise HTTPException(
            status_code=400,
            detail="Usuário já processado"
        )

    user.status = StatusUsuario.negado

    user_repository.salvar(
        db,
        user
    )

    return {
        "msg": "Usuário negado"
    }