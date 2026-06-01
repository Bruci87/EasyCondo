from sqlalchemy import Column, Integer, Date, Enum, ForeignKey
from app.db.session import Base

class Morador(Base):
    __tablename__ = "moradores"

    id = Column(Integer, ForeignKey("usuarios.id"), primary_key=True)
    data_aprovacao = Column(Date, nullable=True)
