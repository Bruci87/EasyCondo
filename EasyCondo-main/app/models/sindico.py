from sqlalchemy import Column, Integer, ForeignKey
from app.db.session import Base

class Sindico(Base):
    __tablename__ = "sindicos"

    id = Column(Integer, ForeignKey("usuarios.id"), primary_key=True)