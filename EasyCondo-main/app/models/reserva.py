from sqlalchemy import Column, Integer, Date, Time, Float, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.status_reserva import StatusReserva
from app.models.area import Area
from app.models.morador import Morador

class Reserva(Base):
    __tablename__ = "reservas"

    id = Column(Integer, primary_key=True, index=True)

    area_id = Column(Integer, ForeignKey("area.id"))
    morador_id = Column(Integer, ForeignKey("moradores.id"))

    data_reserva = Column(Date)
    data_cancelamento = Column(Date, nullable=True)
    horario_inicio = Column(Time)
    horario_fim = Column(Time)
    status = Column(Enum(StatusReserva))
    valor_pago = Column(Float)

    area = relationship("Area")
    morador = relationship("Morador")