// ==========================================
// COMPONENTES DE INTERFACE (UI)
// ==========================================
function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "fixed bottom-6 right-6 z-50 flex flex-col gap-3";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    const bgColor = type === "success" ? "bg-green-600" : "bg-red-600";
    toast.className = `${bgColor} text-white px-6 py-3 rounded-xl shadow-xl font-semibold text-sm transform transition-all duration-300 flex items-center gap-2`;
    toast.innerHTML = `<span class="material-symbols-outlined text-lg">${type === 'success' ? 'check_circle' : 'error'}</span> ${message}`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("opacity-0", "translate-y-2");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// LÓGICA DA APLICAÇÃO
// ==========================================
const MORADOR_ID_SIMULADO = 1;
let areasCache = {}; 
let reservasCache = {};
let todasAsReservasDoCondominio = []; 

function temConflito(novaInicio, novaFim, data, areaId, reservaEditandoId = null) {
    if (!data || !areaId) return false; 

    return todasAsReservasDoCondominio.some(r => {
        if (String(r.status).toUpperCase() === "CANCELADA") return false; 
        if (parseInt(r.area_id) !== parseInt(areaId)) return false;
        if (reservaEditandoId && String(r.id) === String(reservaEditandoId)) return false;

        const dataReservaNormalizada = r.data_reserva.split("T")[0];
        const dataBuscaNormalizada = data.split("T")[0];
        
        if (dataReservaNormalizada !== dataBuscaNormalizada) return false;

        const inicioExistente = r.horario_inicio.substring(0,5);
        const fimExistente = r.horario_fim.substring(0,5);

        return (
            novaInicio < fimExistente &&
            novaFim > inicioExistente
        );
    });
}

function travarDatasPassadas() {
    const campoData = document.getElementById("data");
    if (campoData) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        const dataMinima = `${ano}-${mes}-${dia}`;
        campoData.setAttribute("min", dataMinima);
    }
}

// 🔹 SOLUÇÃO DO SUMIÇO: Mantém sem o atributo 'disabled' para o navegador nunca ocultar o texto, usando classe nativa do Tailwind
function atualizarOpcoesDeHorarioDisponiveis() {
    const areaId = document.getElementById("area").value;
    const dataReserva = document.getElementById("data").value;
    const selectInicio = document.getElementById("inicio");
    const selectFim = document.getElementById("fim");
    const reservaId = document.getElementById("reserva_id") ? document.getElementById("reserva_id").value : "";

    if (!selectInicio || !selectFim) return;

    const valorInicioAnterior = selectInicio.value;
    const valorFimAnterior = selectFim.value;

    selectInicio.innerHTML = '<option value="">Selecione...</option>';
    selectFim.innerHTML = '<option value="">Selecione...</option>';

    const horariosDoDia = [];
    for (let hora = 6; hora < 24; hora++) {
        const strHora = String(hora).padStart(2, '0');
        horariosDoDia.push(`${strHora}:00`, `${strHora}:30`);
    }

    horariosDoDia.forEach(hora => {
        const partes = hora.split(":");
        let m = parseInt(partes[1]) + 30;
        let h = parseInt(partes[0]);
        if (m >= 60) { m = 0; h++; }
        const proximaHoraSimulada = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

        if (temConflito(hora, proximaHoraSimulada, dataReserva, areaId, reservaId)) {
            // Marcamos com o dataset 'ocupado' e cor vermelha forte
            selectInicio.innerHTML += `<option value="${hora}" data-ocupado="true" class="text-red-600 bg-red-50 font-bold text-base" style="color: #ba1a1a !important;">${hora} (Ocupado)</option>`;
        } else {
            selectInicio.innerHTML += `<option value="${hora}">${hora}</option>`;
        }
    });

    horariosDoDia.forEach(hora => {
        const partes = hora.split(":");
        let m = parseInt(partes[1]) - 30;
        let h = parseInt(partes[0]);
        if (m < 0) { m = 30; h--; }
        const horaAnteriorSimulada = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

        if (temConflito(horaAnteriorSimulada, hora, dataReserva, areaId, reservaId)) {
            // Marcamos com o dataset 'ocupado' e cor vermelha forte
            selectFim.innerHTML += `<option value="${hora}" data-ocupado="true" class="text-red-600 bg-red-50 font-bold text-base" style="color: #ba1a1a !important;">${hora} (Ocupado)</option>`;
        } else {
            selectFim.innerHTML += `<option value="${hora}">${hora}</option>`;
        }
    });

    if (valorInicioAnterior) selectInicio.value = valorInicioAnterior;
    if (valorFimAnterior) selectFim.value = valorFimAnterior;
}

async function buscarReservasGeraisCondominio() {
    try {
        const res = await fetch("/api/reserva/condominio/ativas");
        if (res.ok) todasAsReservasDoCondominio = await res.json();
    } catch (e) {
        console.error("Erro ao carregar reservas globais:", e);
    }
}

// ==========================================
// CARREGAMENTO DOS DADOS (GET) & RENDERISMO
// ==========================================
async function carregarAreasNoSelect() {
    try {
        const res = await fetch("/api/area/?t=" + new Date().getTime()); 
        const areas = await res.json();
        const select = document.getElementById("area");
        
        if (select) {
            select.innerHTML = '<option value="">Selecione uma área...</option>';
        }
        
        areas.forEach(area => {
            const isAtivo = (area.ativo === true || area.ativo === 1);
            areasCache[area.id] = area;
            
            if (isAtivo && select) {
                select.innerHTML += `<option value="${area.id}">${area.nome}</option>`;
            }
        });

        if (document.getElementById("listaReservas")) {
            carregarMinhasReservas();
        }
    } catch (error) {
        showToast("Erro ao carregar áreas.", "error");
    }
}

async function carregarMinhasReservas() {
    try {
        await buscarReservasGeraisCondominio();

        const res = await fetch(`/api/reserva/morador/${MORADOR_ID_SIMULADO}`);
        const respostas = await res.json();
        const container = document.getElementById("listaReservas");

        if (!container) return;
        container.innerHTML = "";
        reservasCache = {};
        let totalExibidas = 0;

        const reservasAtivas = respostas.ativas || [];
        const reservasFiltradas = reservasAtivas.filter(r => String(r.status).toUpperCase() !== "CANCELADA");

        if (reservasFiltradas.length === 0) {
            container.innerHTML = `<p class="text-sm text-on-surface-variant text-center py-4">Nenhuma reserva ativa cadastrada.</p>`;
            const contadorReservas = document.getElementById("contadorReservas");
            if (contadorReservas) contadorReservas.innerText = "0 Agendadas";
            atualizarOpcoesDeHorarioDisponiveis();
            return;
        }

        reservasFiltradas.forEach(r => {
            reservasCache[r.id] = r;
            totalExibidas++;

            const partesData = r.data_reserva.split("-");
            const dataFormatada = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;
            const horaInicioFormatada = r.horario_inicio.substring(0, 5);
            const horaFimFormatada = r.horario_fim.substring(0, 5);
            const nomeArea = areasCache[r.area_id] ? areasCache[r.area_id].nome : "Área Comum";

            let statusColor = "bg-green-100 text-green-800";
            if (r.status === "PENDENTE_PAGAMENTO") statusColor = "bg-amber-100 text-amber-800";

            container.innerHTML += `
                <div id="card-reserva-${r.id}" class="p-4 bg-surface border border-slate-100 rounded-xl flex flex-col gap-1 shadow-sm mb-2">
                    <div class="flex justify-between items-start">
                        <div class="flex flex-col gap-1">
                            <span class="font-bold text-slate-800 text-base">${nomeArea}</span>
                            <div class="flex flex-col gap-0.5 text-slate-600 font-normal">
                                <span class="flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-base text-blue-500">calendar_today</span>
                                    ${dataFormatada}
                                </span>
                                <span class="flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-base text-blue-500">schedule</span>
                                    das ${horaInicioFormatada} às ${horaFimFormatada}
                                </span>
                            </div>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${statusColor}">
                            ${r.status}
                        </span>
                    </div>
                    <div class="flex justify-end gap-3 pt-2 border-t border-slate-100 mt-2">
                        <button onclick="verificarPrazosEAgir('${r.id}', 'editar')" 
                            class="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                            <span class="material-symbols-outlined text-sm">edit</span> Editar
                        </button>
                        <button onclick="verificarPrazosEAgir('${r.id}', 'cancelar')" 
                            class="text-xs font-bold text-error hover:underline flex items-center gap-1">
                            <span class="material-symbols-outlined text-sm">cancel</span> Cancelar
                        </button>
                    </div>
                </div>
            `;
        });

        const contadorReservas = document.getElementById("contadorReservas");
        if (contadorReservas) contadorReservas.innerText = `${totalExibidas} Agendadas`;

        atualizarOpcoesDeHorarioDisponiveis();

    } catch (error) {
        showToast("Erro ao carregar lista de reservas.", "error");
    }
}

// ==========================================
// CONTROLE DE PRAZOS E MULTAS (EDITAR / CANCELAR)
// ==========================================
async function verificarPrazosEAgir(id, acao) {
    try {
        const res = await fetch(`/api/reserva/${id}/verificar-prazos`);
        const dadosPrazo = await res.json();
        
        if (dadosPrazo.limite_ultrapassado) {
            const cardTarget = document.getElementById(`card-reserva-${id}`);
            if (cardTarget) {
                cardTarget.innerHTML = `
                    <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 flex flex-col gap-3 shadow-inner">
                        <p class="font-bold flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-base">warning</span> 
                            limite ultrapassado, caso queira cancelar/editar pague a multa: R$ ${dadosPrazo.multa.toFixed(2)}
                        </p>
                        <div class="flex gap-2 justify-end">
                            <button onclick="carregarMinhasReservas()" class="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs">
                                Desistir
                            </button>
                            <button onclick="executarPagamentoMulta('${id}', ${dadosPrazo.multa}, '${acao}')" 
                                class="px-4 py-1.5 bg-red-600 text-white font-black rounded-lg text-xs hover:bg-red-700 tracking-wide uppercase shadow">
                                pagar
                            </button>
                        </div>
                    </div>
                `;
            }
            return;
        }

        if (acao === 'editar') preencherFormEditReserva(id);
        if (acao === 'cancelar') solicitarCancelamentoReserva(id);

    } catch (e) {
        console.error("Erro ao validar prazos da operação:", e);
    }
}

async function executarPagamentoMulta(id, valor, acaoOriginal) {
    try {
        const res = await fetch(`/api/reserva/${id}/pagar-multa`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ valor })
        });
        
        if (res.ok) {
            showToast("Multa paga com sucesso!", "success");
            if (acaoOriginal === 'editar') {
                preencherFormEditReserva(id);
            } else {
                carregarMinhasReservas();
            }
        } else {
            showToast("Erro ao processar pagamento.", "error");
        }
    } catch {
        showToast("Erro de conexão.", "error");
    }
}

function preencherFormEditReserva(id) {
    const r = reservasCache[id];
    if (!r) return;

    document.getElementById("area").value = r.area_id;
    document.getElementById("data").value = r.data_reserva;
    
    atualizarOpcoesDeHorarioDisponiveis();

    document.getElementById("inicio").value = r.horario_inicio.substring(0, 5);
    document.getElementById("fim").value = r.horario_fim.substring(0, 5);
    document.getElementById("reserva_id").value = r.id;

    document.getElementById("btnCancelar").classList.remove("hidden");
    document.getElementById("btnSalvar").innerText = "Atualizar Reserva";
    document.getElementById("reservaForm").scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicao() {
    document.getElementById("reservaForm").reset();
    document.getElementById("reserva_id").value = "";
    document.getElementById("btnCancelar").classList.add("hidden");
    document.getElementById("btnSalvar").innerText = "Confirmar Reserva";
    travarDatasPassadas();
    atualizarOpcoesDeHorarioDisponiveis();
}

async function solicitarCancelamentoReserva(id) {
    if (!confirm("Tem certeza de que deseja cancelar esta reserva?")) return;

    try {
        const res = await fetch(`/api/reserva/${id}/cancelar`, { method: "PATCH" });
        if (res.ok) {
            showToast("Reserva cancelada com sucesso!", "success");
            carregarMinhasReservas();
        } else {
            showToast("Erro ao processar o cancelamento.", "error");
        }
    } catch {
        showToast("Erro de conexão com o servidor.", "error");
    }
}

// ==========================================
// SUBMIT E VALIDAÇÕES DO FORMULÁRIO
// ==========================================
const form = document.getElementById("reservaForm");
if (form) {
    document.getElementById("area").addEventListener("change", atualizarOpcoesDeHorarioDisponiveis);
    document.getElementById("data").addEventListener("change", atualizarOpcoesDeHorarioDisponiveis);
    
    // 🔹 INTERCEPTADOR DE CLIQUE OCUPADO: Bloqueia o envio e avisa via Toast se escolher horário em vermelho
    const monitorarSelecaoOcupada = (selectId) => {
        const selectEl = document.getElementById(selectId);
        selectEl.addEventListener("change", () => {
            const opcaoSelecionada = selectEl.options[selectEl.selectedIndex];
            if (opcaoSelecionada && opcaoSelecionada.getAttribute("data-ocupado") === "true") {
                showToast("Este horário está reservado por outro morador!", "error");
                selectEl.value = ""; // Reseta o campo imediatamente
            }
        });
    };
    
    monitorarSelecaoOcupada("inicio");
    monitorarSelecaoOcupada("fim");

    document.getElementById("inicio").addEventListener("change", () => {
        const inicio = document.getElementById("inicio").value;
        const fim = document.getElementById("fim").value;
        if (inicio && fim && inicio >= fim) {
            showToast("O horário de início deve ser menor que o de fim.", "error");
            document.getElementById("inicio").value = "";
        }
    });
    document.getElementById("fim").addEventListener("change", () => {
        const inicio = document.getElementById("inicio").value;
        const fim = document.getElementById("fim").value;
        if (inicio && fim && inicio >= fim) {
            showToast("O horário de início deve ser menor que o de fim.", "error");
            document.getElementById("fim").value = "";
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const areaId = document.getElementById("area").value;
        const dataReserva = document.getElementById("data").value;
        const inicio = document.getElementById("inicio").value;
        const fim = document.getElementById("fim").value;
        const inputReservaId = document.getElementById("reserva_id");
        const reservaId = inputReservaId ? inputReservaId.value : "";

        // Validar preventivamente se o usuário burlar e tentar submeter um bloco ocupado
        const selInicio = document.getElementById("inicio");
        const selFim = document.getElementById("fim");
        if(selInicio.options[selInicio.selectedIndex].getAttribute("data-ocupado") === "true" ||
           selFim.options[selFim.selectedIndex].getAttribute("data-ocupado") === "true") {
            showToast("Horário indisponível escolhido.", "error");
            return;
        }

        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        const dataMinima = `${ano}-${mes}-${dia}`;

        if (dataReserva < dataMinima) {
            showToast("Não é possível realizar reservas em datas passadas.", "error");
            return;
        }

        if (inicio >= fim) {
            showToast("O horário de início deve ser menor que o de fim.", "error");
            return;
        }

        let hor_inicio = inicio.length === 5 ? inicio + ":00" : inicio;
        let hor_fim = fim.length === 5 ? fim + ":00" : fim;

        const data = {
            area_id: parseInt(areaId),
            morador_id: MORADOR_ID_SIMULADO,
            data_reserva: dataReserva,
            horario_inicio: hor_inicio,
            horario_fim: hor_fim,
            status: "CONFIRMADA",
            valor_pago: 0.0
        };

        const url = reservaId ? `/api/reserva/${reservaId}` : "/api/reserva/";
        const method = reservaId ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                showToast(reservaId ? "Reserva atualizada com sucesso!" : "Reserva salva com sucesso!", "success");
                cancelarEdicao();
                carregarMinhasReservas();
            } else {
                const erro = await res.json();
                showToast(erro.detail || "Erro ao salvar.", "error");
            }
        } catch {
            showToast("Erro de conexão com o servidor.", "error");
        }
    });
}

// Inicialização
travarDatasPassadas();
carregarAreasNoSelect();