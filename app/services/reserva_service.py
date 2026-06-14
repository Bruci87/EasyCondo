from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.reserva import Reserva
from app.models.status_reserva import StatusReserva
from app.repositories import area_repository
from app.schemas.reserva import ReservaCreate

from app.repositories import reserva_repository


def _buscar_area_ou_404(db: Session, area_id: int):
    area = area_repository.buscar_por_id(db, area_id)
    if not area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Área não encontrada"
        )
    return area


def _validar_intervalo_horario(
    horario_inicio,
    horario_fim
):
    if horario_inicio >= horario_fim:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O horário de início deve ser menor que o horário de fim."
        )


def _validar_conflito_reserva(
    db: Session,
    area_id: int,
    data_reserva,
    horario_inicio,
    horario_fim,
    reserva_id: int | None = None
):
    reservas_conflitantes = reserva_repository.listar_conflitantes_por_area_data(
        db,
        area_id,
        data_reserva,
        reserva_id
    )

    for reserva in reservas_conflitantes:
        if reserva.horario_inicio < horario_fim and reserva.horario_fim > horario_inicio:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe uma reserva nesse horário para esta área."
            )


def _aplicar_regra_taxa(reserva: Reserva, area) -> None:
    if area.possui_taxa:
        reserva.status = StatusReserva.pendentePagamento
        reserva.valor_pago = float(area.taxa or 0.0)
    else:
        reserva.status = StatusReserva.confirmada
        reserva.valor_pago = 0.0


def criar_reserva(
    db: Session,
    reserva_data: ReservaCreate
):

    _validar_intervalo_horario(
        reserva_data.horario_inicio,
        reserva_data.horario_fim
    )

    area = _buscar_area_ou_404(db, reserva_data.area_id)

    _validar_conflito_reserva(
        db,
        reserva_data.area_id,
        reserva_data.data_reserva,
        reserva_data.horario_inicio,
        reserva_data.horario_fim
    )

    nova_reserva = Reserva(
        **reserva_data.model_dump()
    )

    _aplicar_regra_taxa(nova_reserva, area)

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


def listar_todas_reservas_ativas_do_condominio(
    db: Session
):
    return reserva_repository.listar_todas_ativas(db)


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

    _validar_intervalo_horario(
        reserva_data.horario_inicio,
        reserva_data.horario_fim
    )

    area = _buscar_area_ou_404(db, reserva_data.area_id)

    _validar_conflito_reserva(
        db,
        reserva_data.area_id,
        reserva_data.data_reserva,
        reserva_data.horario_inicio,
        reserva_data.horario_fim,
        reserva_id
    )

    # Atualiza apenas os campos permitidos

    reserva.area_id = reserva_data.area_id
    reserva.data_reserva = reserva_data.data_reserva
    reserva.horario_inicio = reserva_data.horario_inicio
    reserva.horario_fim = reserva_data.horario_fim
    _aplicar_regra_taxa(reserva, area)

    return reserva_repository.salvar(
        db,
        reserva
    )


def confirmar_pagamento_reserva(
    db: Session,
    reserva_id: int
):
    reserva = reserva_repository.buscar_por_id(
        db,
        reserva_id
    )

    if not reserva:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reserva não encontrada"
        )

    if reserva.status != StatusReserva.pendentePagamento:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta reserva não está aguardando pagamento."
        )

    area = _buscar_area_ou_404(db, reserva.area_id)

    reserva.valor_pago = float(area.taxa or reserva.valor_pago or 0.0)
    reserva.status = StatusReserva.confirmada

    return reserva_repository.salvar(
        db,
        reserva
    )