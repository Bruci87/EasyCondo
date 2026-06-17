# Arquivo: app/api/routes/reserva.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db, get_current_user_id
from app.schemas.reserva import ReservaCreate, ReservaResponse
from app.services import reserva_service

# ALERADO AQUI: prefix="/api/reserva" (no singular)
router = APIRouter(prefix="/api/reserva", tags=["Reserva"])

@router.post("/", response_model=ReservaResponse)
def criar(
    data: ReservaCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    return reserva_service.criar_reserva(db, data, user_id)

@router.get("/morador/{morador_id}", response_model=List[ReservaResponse])
def listar_do_morador(morador_id: int, db: Session = Depends(get_db)):
    return reserva_service.listar_reservas_por_morador(db, morador_id)


@router.get("/minhas", response_model=List[ReservaResponse])
def listar_minhas_reservas(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    return reserva_service.listar_reservas_por_morador(db, user_id)


@router.get("/condominio/ativas", response_model=List[ReservaResponse])
def listar_ativas_do_condominio(db: Session = Depends(get_db)):
    return reserva_service.listar_todas_reservas_ativas_do_condominio(db)

@router.put("/{reserva_id}", response_model=ReservaResponse)
def atualizar(
    reserva_id: int,
    data: ReservaCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    reserva = reserva_service.atualizar_reserva(db, reserva_id, data, user_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva não encontrada")
    return reserva


@router.post("/{reserva_id}/cancelar", response_model=ReservaResponse)
def cancelar(
    reserva_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    return reserva_service.cancelar_reserva(db, reserva_id, user_id)


@router.post("/{reserva_id}/paguei", response_model=ReservaResponse)
def confirmar_pagamento(
    reserva_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    return reserva_service.confirmar_pagamento_reserva(db, reserva_id, user_id)