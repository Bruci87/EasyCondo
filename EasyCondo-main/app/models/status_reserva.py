from enum import Enum

class StatusReserva(str, Enum):
    confirmada = "CONFIRMADA"
    pendentePagamento = "PENDENTE_PAGAMENTO"
    cancelada = "CANCELADA"