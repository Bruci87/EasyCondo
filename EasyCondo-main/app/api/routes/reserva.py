from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict
from app.api.deps import get_db
from app.schemas.reserva import ReservaCreate, ReservaResponse
from app.services import reserva_service

router = APIRouter(prefix="/api/reserva", tags=["Reserva"])


@router.post("/", response_model=ReservaResponse)
def criar(data: ReservaCreate, db: Session = Depends(get_db)):
    # Delegado inteiramente para o Service tratar a criação e proteção retroativa
    return reserva_service.criar_reserva(db, data)


@router.get("/morador/{morador_id}", response_model=Dict[str, List[ReservaResponse]])
def listar_do_morador(morador_id: int, db: Session = Depends(get_db)):
    # Delegado para o Service processar e separar o dicionário de ativas/histórico
    return reserva_service.separar_ativas_e_historico(db, morador_id)


@router.get("/{reserva_id}/verificar-prazos")
def verificar_prazos(reserva_id: int, db: Session = Depends(get_db)):
    # Rota que consulta se o limite de tempo estourou e calcula a multa
    return reserva_service.verificar_limite_prazos(db, reserva_id)


@router.get("/condominio/ativas", response_model=List[ReservaResponse])
def listar_todas_ativas_condominio(db: Session = Depends(get_db)):
    # Rota nova essencial para buscar os horários ocupados por outros moradores
    return reserva_service.listar_todas_ativas_do_condominio(db)


@router.put("/{reserva_id}", response_model=ReservaResponse)
def atualizar(reserva_id: int, data: ReservaCreate, db: Session = Depends(get_db)):
    reserva = reserva_service.atualizar_reserva(db, reserva_id, data)
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva não encontrada")
    return reserva


@router.patch("/{reserva_id}/cancelar")
def cancelar_reserva_morador(reserva_id: int, db: Session = Depends(get_db)):
    # Delegado para o Service executar o cancelamento direto dentro do prazo
    return reserva_service.cancelar_reserva_direta(db, reserva_id)


@router.post("/{reserva_id}/pagar-multa")
def pagar_multa(reserva_id: int, dados: dict, db: Session = Depends(get_db)):
    # Rota nova acionada pelo botão "Pagar" se o prazo tiver expirado
    valor = dados.get("valor", 50.0)
    return reserva_service.aplicar_pagamento_multa(db, reserva_id, valor)