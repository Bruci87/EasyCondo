from datetime import date

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


def _validar_prazo_cancelamento_edicao(reserva: Reserva, area, acao: str) -> None:
    dias_limite = int(area.limite_cancelamento_edicao_dias or 0)
    dias_para_reserva = (reserva.data_reserva - date.today()).days

    if dias_para_reserva < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível {acao} uma reserva com data passada."
        )

    if dias_limite > 0 and dias_para_reserva < dias_limite:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível {acao} esta reserva com menos de {dias_limite} dia(s) de antecedência."
        )


def _validar_edicao_reserva(reserva: Reserva, area) -> None:
    if reserva.status == StatusReserva.cancelada:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível editar uma reserva cancelada."
        )

    if area.possui_taxa and reserva.status == StatusReserva.confirmada:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reservas pagas não podem ser editadas."
        )

    _validar_prazo_cancelamento_edicao(reserva, area, "editar")


def _validar_cancelamento_reserva(reserva: Reserva, area) -> None:
    if reserva.status == StatusReserva.cancelada:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta reserva já está cancelada."
        )

    _validar_prazo_cancelamento_edicao(reserva, area, "cancelar")


def criar_reserva(
    db: Session,
    reserva_data: ReservaCreate,
    user_id: int
):

    if reserva_data.morador_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você só pode criar reservas para o seu usuário."
        )

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
    reserva_data: ReservaCreate,
    user_id: int
):

    reserva = reserva_repository.buscar_por_id(
        db,
        reserva_id
    )

    if not reserva:
        return None

    if reserva.morador_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não pode editar reserva de outro morador."
        )

    area_atual = _buscar_area_ou_404(db, reserva.area_id)
    _validar_edicao_reserva(reserva, area_atual)

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


def cancelar_reserva(
    db: Session,
    reserva_id: int,
    user_id: int
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

    if reserva.morador_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não pode cancelar reserva de outro morador."
        )

    area = _buscar_area_ou_404(db, reserva.area_id)
    _validar_cancelamento_reserva(reserva, area)

    reserva.status = StatusReserva.cancelada
    reserva.data_cancelamento = date.today()

    return reserva_repository.salvar(
        db,
        reserva
    )


def confirmar_pagamento_reserva(
    db: Session,
    reserva_id: int,
    user_id: int
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

    if reserva.morador_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não pode confirmar pagamento de reserva de outro morador."
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