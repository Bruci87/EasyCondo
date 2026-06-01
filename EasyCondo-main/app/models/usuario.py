from sqlalchemy import Column, Integer, String, Enum
from app.db.session import Base
from app.models.status_usuario import StatusUsuario

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    senha = Column(String, nullable=False)
    apartamento = Column(String, nullable=False)
    status = Column(Enum(StatusUsuario), default=StatusUsuario.pendente)