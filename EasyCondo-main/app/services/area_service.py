from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.area import Area
from app.schemas.area import AreaCreate

from app.repositories import area_repository


def listar_area(db: Session):
    return area_repository.listar(db)


def criar_area(db: Session, area_data: AreaCreate):

    area_existente = (
        area_repository.buscar_area_ativa_por_nome(
            db,
            area_data.nome
        )
    )

    if area_existente:
        raise HTTPException(
            status_code=400,
            detail="Já existe uma área ativa com esse nome."
        )

    nova_area = Area(**area_data.model_dump())

    return area_repository.criar(db, nova_area)


def eliminar_area(db: Session, area_id: int):

    area = area_repository.buscar_por_id(db, area_id)

    if not area:
        return False

    area_repository.deletar(db, area)

    return True


def atualizar_area(
    db: Session,
    area_id: int,
    area_data: AreaCreate
):

    area = area_repository.buscar_por_id(db, area_id)

    if not area:
        return None

    area_existente = (
        area_repository.buscar_area_ativa_por_nome_excluindo_id(
            db,
            area_data.nome,
            area_id
        )
    )

    if area_existente:
        raise HTTPException(
            status_code=400,
            detail="Já existe uma área ativa com esse nome."
        )

    for key, value in area_data.model_dump().items():
        setattr(area, key, value)

    return area_repository.salvar(db, area)


def alternar_status_area(
    db: Session,
    area_id: int
):

    area = area_repository.buscar_por_id(db, area_id)

    if not area:
        return None

    area.ativo = not area.ativo

    return area_repository.salvar(db, area)