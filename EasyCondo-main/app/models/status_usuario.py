from enum import Enum

class StatusUsuario(str, Enum):
    pendente = "PENDENTE"
    aprovado = "APROVADO"
    negado = "NEGADO"