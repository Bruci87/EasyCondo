from pydantic import BaseModel, EmailStr

class SolicitacaoCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    confirmar_senha: str
    apartamento: str