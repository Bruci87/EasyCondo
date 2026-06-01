from pydantic import BaseModel
from datetime import date, time
from app.models.status_reserva import StatusReserva

class ReservaBase(BaseModel):
    area_id: int
    morador_id: int
    data_reserva: date
    horario_inicio: time
    horario_fim: time
    valor_pago: float = 0.0
    status: StatusReserva = StatusReserva.confirmada

class ReservaCreate(ReservaBase):
    pass

class ReservaResponse(ReservaBase):
    id: int

    class Config:
        from_attributes = True