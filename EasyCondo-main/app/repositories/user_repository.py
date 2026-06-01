from sqlalchemy.orm import Session

from app.models.usuario import Usuario
from app.models.status_usuario import StatusUsuario


def buscar_por_email(
    db: Session,
    email: str
):
    return (
        db.query(Usuario)
        .filter(Usuario.email == email)
        .first()
    )


def buscar_por_id(
    db: Session,
    user_id: int
):
    return db.get(Usuario, user_id)


def listar_pendentes(
    db: Session
):
    return (
        db.query(Usuario)
        .filter(
            Usuario.status == StatusUsuario.pendente
        )
        .all()
    )


def criar(
    db: Session,
    usuario: Usuario
):

    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    return usuario


def salvar(
    db: Session,
    usuario: Usuario
):

    db.commit()
    db.refresh(usuario)

    return usuario