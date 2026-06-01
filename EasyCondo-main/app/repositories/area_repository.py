from sqlalchemy.orm import Session

from app.models.area import Area


def listar(db: Session):
    return db.query(Area).all()


def buscar_por_id(db: Session, area_id: int):
    return (
        db.query(Area)
        .filter(Area.id == area_id)
        .first()
    )


def buscar_area_ativa_por_nome(
    db: Session,
    nome: str
):
    return (
        db.query(Area)
        .filter(
            Area.nome == nome,
            Area.ativo == True
        )
        .first()
    )


def buscar_area_ativa_por_nome_excluindo_id(
    db: Session,
    nome: str,
    area_id: int
):
    return (
        db.query(Area)
        .filter(
            Area.nome == nome,
            Area.ativo == True,
            Area.id != area_id
        )
        .first()
    )


def criar(db: Session, area: Area):

    db.add(area)
    db.commit()
    db.refresh(area)

    return area


def salvar(db: Session, area: Area):

    db.commit()
    db.refresh(area)

    return area


def deletar(db: Session, area: Area):

    db.delete(area)
    db.commit()