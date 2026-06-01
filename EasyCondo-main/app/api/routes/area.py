from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db
from app.schemas.area import AreaCreate, AreaResponse
from app.services import area_service

router = APIRouter(prefix="/api/area", tags=["Área"])

@router.get("/", response_model=List[AreaResponse])
def listar(db: Session = Depends(get_db)):
    return area_service.listar_area(db)

@router.post("/", response_model=AreaResponse)
def criar(data: AreaCreate, db: Session = Depends(get_db)):
    return area_service.criar_area(db, data)

@router.put("/{area_id}", response_model=AreaResponse)
def atualizar(area_id: int, data: AreaCreate, db: Session = Depends(get_db)):
    area = area_service.atualizar_area(db, area_id, data)
    if not area:
        raise HTTPException(status_code=404, detail="Área não encontrada")
    return area

@router.patch("/{area_id}/status")
def alternar_status(area_id: int, db: Session = Depends(get_db)):
    area = area_service.alternar_status_area(db, area_id)
    if not area:
        raise HTTPException(status_code=404, detail="Área não encontrada")
    return {"msg": "Status alterado", "ativo": area.ativo}