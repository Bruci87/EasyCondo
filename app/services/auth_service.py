from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.usuario import Usuario
from app.models.status_usuario import StatusUsuario

from app.repositories import user_repository


def register(db: Session, data):

    # VALIDAÇÕES

    if (
        not data.nome
        or not data.email
        or not data.senha
        or not data.apartamento
    ):
        raise HTTPException(
            status_code=400,
            detail="MISSING_FIELDS"
        )

    if data.senha != data.confirmar_senha:
        raise HTTPException(
            status_code=400,
            detail="PASSWORD_MISMATCH"
        )

    if len(data.senha) < 6:
        raise HTTPException(
            status_code=400,
            detail="WEAK_PASSWORD"
        )

    # REGRA DE NEGÓCIO

    user_existente = user_repository.buscar_por_email(
        db,
        data.email
    )

    if user_existente:
        raise HTTPException(
            status_code=400,
            detail="EMAIL_EXISTS"
        )

    novo_user = Usuario(
        nome=data.nome,
        email=data.email,
        senha=data.senha,
        apartamento=data.apartamento,
        status=StatusUsuario.pendente
    )

    user_repository.criar(
        db,
        novo_user
    )

    return {
        "msg": "Cadastro enviado para aprovação"
    }


def login(
    db: Session,
    email: str,
    senha: str
):

    user = user_repository.buscar_por_email(
        db,
        email
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="EMAIL_NOT_FOUND"
        )

    if user.senha != senha:
        raise HTTPException(
            status_code=400,
            detail="INVALID_PASSWORD"
        )

    if user.status != StatusUsuario.aprovado:
        raise HTTPException(
            status_code=403,
            detail="USER_NOT_APPROVED"
        )

    return {
        "msg": "Login realizado",
        "user_id": user.id
    }