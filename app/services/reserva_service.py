from sqlalchemy.orm import Session

from app.models.reserva import Reserva
from app.schemas.reserva import ReservaCreate

from app.repositories import reserva_repository


def criar_reserva(
    db: Session,
    reserva_data: ReservaCreate
):

    nova_reserva = Reserva(
        **reserva_data.model_dump()
    )

    return reserva_repository.criar(
        db,
        nova_reserva
    )


def listar_reservas_por_morador(
    db: Session,
    morador_id: int
):
    return reserva_repository.listar_por_morador(
        db,
        morador_id
    )


def atualizar_reserva(
    db: Session,
    reserva_id: int,
    reserva_data: ReservaCreate
):

    reserva = reserva_repository.buscar_por_id(
        db,
        reserva_id
    )

    if not reserva:
        return None

    # Atualiza apenas os campos permitidos

    reserva.area_id = reserva_data.area_id
    reserva.data_reserva = reserva_data.data_reserva
    reserva.horario_inicio = reserva_data.horario_inicio
    reserva.horario_fim = reserva_data.horario_fim

    return reserva_repository.salvar(
        db,
        reserva
    )