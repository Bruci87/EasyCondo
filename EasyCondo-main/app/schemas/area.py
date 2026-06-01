from pydantic import BaseModel
from typing import Optional

class AreaBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    taxa: float = 0.0
    possui_taxa: bool = False
    antecedencia_minima_horas: int = 0
    limite_semanal: int = 0
    limite_mensal: int = 0
    tempo_maximo_desistencia_horas: int = 0
    limite_cancelamento_edicao_dias: int = 0
    ativo: bool = True

class AreaCreate(AreaBase):
    pass

class AreaResponse(AreaBase):
    id: int

    class Config:
        from_attributes = True