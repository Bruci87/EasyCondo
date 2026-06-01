import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.reserva import Reserva
from app.models.status_reserva import StatusReserva
from app.schemas.reserva import ReservaCreate
from app.repositories import reserva_repository, area_repository


# 🔹 ADICIONADO: Função interna auxiliar para calcular a quantidade de reservas num período
def contar_reservas_no_periodo(db: Session, morador_id: int, area_id: int, data_inicio: datetime.date, data_fim: datetime.date) -> int:
    todas = reserva_repository.listar_por_morador(db, morador_id)
    contador = 0
    for r in todas:
        if getattr(r, 'status', None) == "CANCELADA":
            continue
        if getattr(r, 'area_id', None) != area_id:
            continue
        
        data_reserva = getattr(r, 'data_reserva', None)
        if data_reserva and data_inicio <= data_reserva <= data_fim:
            contador += 1
            
    return contador


def criar_reserva(
    db: Session,
    reserva_data: ReservaCreate
):
    if reserva_data.data_reserva < datetime.date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível realizar reservas em datas passadas."
        )

    # 🔹 ADICIONADO: Validação de Limites Semanal e Mensal baseados nos parâmetros da Área
    area = area_repository.buscar_por_id(db, reserva_data.area_id)
    if area:
        # Define o intervalo da semana corrente (Segunda a Domingo)
        dia_da_semana = reserva_data.data_reserva.weekday()
        inicio_semana = reserva_data.data_reserva - datetime.timedelta(days=dia_da_semana)
        fim_semana = inicio_semana + datetime.timedelta(days=6)

        # Define o intervalo do mês corrente
        inicio_mes = reserva_data.data_reserva.replace(day=1)
        if reserva_data.data_reserva.month == 12:
            fim_mes = reserva_data.data_reserva.replace(year=reserva_data.data_reserva.year + 1, month=1, day=1) - datetime.timedelta(days=1)
        else:
            fim_mes = reserva_data.data_reserva.replace(month=reserva_data.data_reserva.month + 1, day=1) - datetime.timedelta(days=1)

        # Checagem do limite semanal configurado na Área
        limite_semanal = getattr(area, 'limite_reserva_semanal', 0)
        if limite_semanal > 0:
            qtd_semana = contar_reservas_no_periodo(db, reserva_data.morador_id, reserva_data.area_id, inicio_semana, fim_semana)
            if qtd_semana >= limite_semanal:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Limite semanal atingido para esta área. Máximo permitido: {limite_semanal} reservas por semana."
                )

        # Checagem do limite mensal configurado na Área
        limite_mensal = getattr(area, 'limite_reserva_mensal', 0)
        if limite_mensal > 0:
            qtd_mes = contar_reservas_no_periodo(db, reserva_data.morador_id, reserva_data.area_id, inicio_mes, fim_mes)
            if qtd_mes >= limite_mensal:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Limite mensal atingido para esta área. Máximo permitido: {limite_mensal} reservas por mês."
                )

    nova_reserva = Reserva(
        **reserva_data.model_dump()
    )

    return reserva_repository.criar(
        db,
        nova_reserva
    )


def listar_reservas_por_morador(
    db: Session,
    morador_id: int
):
    return reserva_repository.listar_por_morador(
        db,
        morador_id
    )


def atualizar_reserva(
    db: Session,
    reserva_id: int,
    reserva_data: ReservaCreate
):
    reserva = reserva_repository.buscar_por_id(
        db,
        reserva_id
    )

    if not reserva:
        return None

    # 🔹 ADICIONADO: Validação de Limites Semanal/Mensal na Edição (Descontando a própria reserva sendo alterada)
    area = area_repository.buscar_por_id(db, reserva_data.area_id)
    if area:
        dia_da_semana = reserva_data.data_reserva.weekday()
        inicio_semana = reserva_data.data_reserva - datetime.timedelta(days=dia_da_semana)
        fim_semana = inicio_semana + datetime.timedelta(days=6)
        
        inicio_mes = reserva_data.data_reserva.replace(day=1)
        if reserva_data.data_reserva.month == 12:
            fim_mes = reserva_data.data_reserva.replace(year=reserva_data.data_reserva.year + 1, month=1, day=1) - datetime.timedelta(days=1)
        else:
            fim_mes = reserva_data.data_reserva.replace(month=reserva_data.data_reserva.month + 1, day=1) - datetime.timedelta(days=1)

        limite_semanal = getattr(area, 'limite_reserva_semanal', 0)
        if limite_semanal > 0:
            qtd_semana = contar_reservas_no_periodo(db, reserva_data.morador_id, reserva_data.area_id, inicio_semana, fim_semana)
            # Se a reserva já estava agendada para essa mesma semana e área, ignora o peso dela na contagem
            if reserva.data_reserva >= inicio_semana and reserva.data_reserva <= fim_semana and reserva.area_id == reserva_data.area_id:
                qtd_semana -= 1
            if qtd_semana >= limite_semanal:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Limite semanal atingido para esta área. Máximo permitido: {limite_semanal} reservas por semana."
                )

        limite_mensal = getattr(area, 'limite_reserva_mensal', 0)
        if limite_mensal > 0:
            qtd_mes = contar_reservas_no_periodo(db, reserva_data.morador_id, reserva_data.area_id, inicio_mes, fim_mes)
            if reserva.data_reserva >= inicio_mes and reserva.data_reserva <= fim_mes and reserva.area_id == reserva_data.area_id:
                qtd_mes -= 1
            if qtd_mes >= limite_mensal:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Limite mensal atingido para esta área. Máximo permitido: {limite_mensal} reservas por mês."
                )

    # Atualiza apenas os campos permitidos
    reserva.area_id = reserva_data.area_id
    reserva.data_reserva = reserva_data.data_reserva
    reserva.horario_inicio = reserva_data.horario_inicio
    reserva.horario_fim = reserva_data.horario_fim

    return reserva_repository.salvar(
        db,
        reserva
    )


# 🔹 SEU CÓDIGO ORIGINAL: Separação lógica de ativas/histórico migrada da rota
def separar_ativas_e_historico(db: Session, morador_id: int):
    todas_reservas = reserva_repository.listar_por_morador(db, morador_id)
    
    hoje = datetime.date.today()
    agora = datetime.datetime.now().time()

    reservas_ativas = []
    reservas_historico = []

    for reserva in todas_reservas:
        data_reserva = getattr(reserva, 'data_reserva', None)
        hora_fim_crua = getattr(reserva, 'horario_fim', None)
        status_reserva = getattr(reserva, 'status', None)

        if data_reserva is None:
            continue

        if status_reserva == "CANCELADA":
            reservas_historico.append(reserva)
            continue

        if data_reserva < hoje:
            reservas_historico.append(reserva)
        elif data_reserva == hoje:
            if isinstance(hora_fim_crua, str):
                try:
                    hora_fim_objeto = datetime.datetime.strptime(hora_fim_crua, "%H:%M").time()
                except ValueError:
                    try:
                        hora_fim_objeto = datetime.datetime.strptime(hora_fim_crua, "%H:%M:%S").time()
                    except ValueError:
                        hora_fim_objeto = None
            elif isinstance(hora_fim_crua, datetime.time):
                hora_fim_objeto = hora_fim_crua
            elif isinstance(hora_fim_crua, datetime.timedelta):
                hora_fim_objeto = (datetime.datetime.min + hora_fim_crua).time()
            else:
                hora_fim_objeto = None

            if hora_fim_objeto and hora_fim_objeto < agora:
                reservas_historico.append(reserva)
            else:
                reservas_ativas.append(reserva)
        else:
            reservas_ativas.append(reserva)

    return {
        "ativas": reservas_ativas,
        "historico": reservas_historico
    }


# 🔹 SEU CÓDIGO ORIGINAL: Busca global para o validador de horários em vermelho
def listar_todas_ativas_do_condominio(db: Session):
    return reserva_repository.listar_todas_ativas(db)


# 🔹 SEU CÓDIGO ORIGINAL: Validador matemático de estouro de limites e aplicação de multa
def verificar_limite_prazos(db: Session, reserva_id: int):
    reserva = reserva_repository.buscar_por_id(db, reserva_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva não encontrada")
        
    area = area_repository.buscar_por_id(db, reserva.area_id)
    if not area:
        raise HTTPException(status_code=404, detail="Área não encontrada")

    # Une a data e a hora inicial da reserva em um único objeto datetime
    data_hora_reserva = datetime.datetime.combine(reserva.data_reserva, reserva.horario_inicio)
    agora = datetime.datetime.now()
    
    # Calcula a diferença em horas decimais
    diferenca_horas = (data_hora_reserva - agora).total_seconds() / 3600.0

    # Determina o limite da área (convertendo dias para horas ou pegando horas brutas)
    limite_horas = area.limite_cancelamento_edicao_dias * 24 if area.limite_cancelamento_edicao_dias > 0 else area.tempo_maximo_desistencia_horas

    # Caso falte menos tempo do que o estipulado, ativa o gatilho da multa
    if diferenca_horas < limite_horas:
        return {
            "limite_ultrapassado": True,
            "multa": area.taxa if area.possui_taxa else 50.0  # R$ 50,00 base se a taxa for nula
        }
        
    return {"limite_ultrapassado": False, "multa": 0.0}


# 🔹 SEU CÓDIGO ORIGINAL: Cancelamento comum direto (dentro do prazo regulamentar)
def cancelar_reserva_direta(db: Session, reserva_id: int):
    reserva = reserva_repository.buscar_por_id(db, reserva_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva não encontrada")
        
    reserva.status = StatusReserva.cancelada
    return reserva_repository.salvar(db, reserva)


# 🔹 SEU CÓDIGO ORIGINAL: Processa o cancelamento mediante quitação da taxa de multa
def aplicar_pagamento_multa(db: Session, reserva_id: int, valor_multa: float):
    reserva = reserva_repository.buscar_por_id(db, reserva_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva não encontrada")
        
    reserva.valor_pago = valor_multa
    reserva.status = StatusReserva.cancelada
    return reserva_repository.salvar(db, reserva)