from sqlalchemy.orm import Session

from app.models.reserva import Reserva


def criar(
    db: Session,
    reserva: Reserva
):

    db.add(reserva)
    db.commit()
    db.refresh(reserva)

    return reserva


def listar_por_morador(
    db: Session,
    morador_id: int
):
    return (
        db.query(Reserva)
        .filter(Reserva.morador_id == morador_id)
        .all()
    )


def buscar_por_id(
    db: Session,
    reserva_id: int
):
    return (
        db.query(Reserva)
        .filter(Reserva.id == reserva_id)
        .first()
    )


def salvar(
    db: Session,
    reserva: Reserva
):

    db.commit()
    db.refresh(reserva)

    return reserva