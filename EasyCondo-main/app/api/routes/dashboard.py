from fastapi import APIRouter
from app.db.session import SessionLocal
from app.models.usuario import Usuario
from app.models.reserva import Reserva

router = APIRouter()

@router.get("/api/dashboard")
def get_dashboard():
    db = SessionLocal()

    reservas_ativas = db.query(Reserva).filter(Reserva.status == "ATIVA").count()
    total_residentes = db.query(Usuario).count()
    db.close()

    return {
        "reservas_ativas": reservas_ativas,
        "total_residentes": total_residentes
    }