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
    toast.className = `${bgColor} text-white px-6 py-3 rounded-xl shadow-xl font-semibold text-sm transform transition-all duration-300 translate-y-10 opacity-0 flex items-center gap-2`;
    toast.innerHTML = `<span class="material-symbols-outlined text-lg">${type === "success" ? "check_circle" : "error"}</span> ${message}`;

    container.appendChild(toast);

    setTimeout(() => toast.classList.remove("translate-y-10", "opacity-0"), 10);
    setTimeout(() => {
        toast.classList.add("opacity-0", "translate-y-2");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// LÓGICA DA APLICAÇÃO
// ==========================================
const MORADOR_ID_SIMULADO = 1;
const HORARIO_INICIAL_MINUTOS = 6 * 60;
const HORARIO_FINAL_MINUTOS = 23 * 60 + 30;
const PASSO_MINUTOS = 30;

let areasCache = {};
let reservasCache = {};
let todasReservasCondominio = [];
let diasDisponiveisModal = [];
let diaSelecionadoModal = "";

function formatarMoeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(Number(valor) || 0);
}

function formatarDataBr(dataISO) {
    if (!dataISO) return "";

    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
}

function normalizarData(data) {
    if (!data) return "";
    return String(data).split("T")[0];
}

function obterAreaDaReserva(reserva) {
    return areasCache[reserva.area_id] || null;
}

function obterDiasParaReserva(dataReserva) {
    if (!dataReserva) return Number.NEGATIVE_INFINITY;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const data = new Date(`${normalizarData(dataReserva)}T00:00:00`);
    data.setHours(0, 0, 0, 0);

    return Math.floor((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function reservaDentroDoPrazoEdicaoECancelamento(reserva, area) {
    if (!reserva || !area) return false;

    return obterDiasParaReserva(reserva.data_reserva) >= Number(area.limite_cancelamento_edicao_dias || 0);
}

function reservaPodeSerEditada(reserva, area) {
    if (!reserva || !area) return false;

    const statusNormalizado = String(reserva.status || "").toUpperCase();
    if (statusNormalizado === "CANCELADA") return false;

    if (area.possui_taxa === true || area.possui_taxa === 1) {
        if (statusNormalizado === "CONFIRMADA") return false;
    }

    return reservaDentroDoPrazoEdicaoECancelamento(reserva, area);
}

function reservaPodeSerCancelada(reserva, area) {
    if (!reserva || !area) return false;

    const statusNormalizado = String(reserva.status || "").toUpperCase();
    if (statusNormalizado === "CANCELADA") return false;

    return reservaDentroDoPrazoEdicaoECancelamento(reserva, area);
}

function converterHoraParaMinutos(hora) {
    if (!hora) return 0;

    const partes = String(hora).substring(0, 5).split(":");
    return parseInt(partes[0], 10) * 60 + parseInt(partes[1], 10);
}

function converterMinutosParaHora(minutos) {
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function obterReservaEditandoId() {
    const inputReservaId = document.getElementById("reserva_id");
    return inputReservaId ? inputReservaId.value : "";
}

function obterAreaSelecionada() {
    const selectArea = document.getElementById("area");
    return selectArea ? selectArea.value : "";
}

function atualizarBotaoDisponibilidade() {
    const botao = document.getElementById("btnAbrirDisponibilidade");
    if (!botao) return;

    const temAreaSelecionada = Boolean(obterAreaSelecionada());
    botao.disabled = !temAreaSelecionada;
    botao.classList.toggle("opacity-50", !temAreaSelecionada);
    botao.classList.toggle("cursor-not-allowed", !temAreaSelecionada);
}

function atualizarTextoAreaModal() {
    const areaId = obterAreaSelecionada();
    const textoArea = document.getElementById("textoAreaModal");

    if (!textoArea) return;

    const area = areasCache[areaId];
    textoArea.innerText = area ? area.nome : "Selecione uma área";
}

function abrirModalDisponibilidade() {
    const areaId = obterAreaSelecionada();
    if (!areaId) {
        showToast("Selecione uma área antes de ver a disponibilidade.", "error");
        return;
    }

    const modal = document.getElementById("modalDisponibilidade");
    if (!modal) return;

    atualizarTextoAreaModal();
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    renderizarDiasDisponiveis();
}

function fecharModalDisponibilidade() {
    const modal = document.getElementById("modalDisponibilidade");
    if (!modal) return;

    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function reservasConflitantesPara(areaId, data, reservaEditandoId = "") {
    return todasReservasCondominio.filter((reserva) => {
        if (String(reserva.status || "").toUpperCase() === "CANCELADA") return false;
        if (String(reserva.area_id) !== String(areaId)) return false;
        if (normalizarData(reserva.data_reserva) !== data) return false;
        if (reservaEditandoId && String(reserva.id) === String(reservaEditandoId)) return false;

        return true;
    });
}

function temConflito(novaInicio, novaFim, data, areaId, reservaEditandoId = "") {
    if (!data || !areaId) return false;

    const inicioNovo = converterHoraParaMinutos(novaInicio);
    const fimNovo = converterHoraParaMinutos(novaFim);

    return reservasConflitantesPara(areaId, data, reservaEditandoId).some((reserva) => {
        const inicioExistente = converterHoraParaMinutos(reserva.horario_inicio);
        const fimExistente = converterHoraParaMinutos(reserva.horario_fim);

        return inicioNovo < fimExistente && fimNovo > inicioExistente;
    });
}

function gerarHorariosDisponiveis(areaId, data, reservaEditandoId = "") {
    const horarios = [];

    for (let inicio = HORARIO_INICIAL_MINUTOS; inicio <= HORARIO_FINAL_MINUTOS - PASSO_MINUTOS; inicio += PASSO_MINUTOS) {
        const fim = inicio + PASSO_MINUTOS;
        const inicioFormatado = converterMinutosParaHora(inicio);
        const fimFormatado = converterMinutosParaHora(fim);

        if (!temConflito(inicioFormatado, fimFormatado, data, areaId, reservaEditandoId)) {
            horarios.push({
                inicio: inicioFormatado,
                fim: fimFormatado
            });
        }
    }

    return horarios;
}

function gerarDiasDisponiveis(areaId, reservaEditandoId = "") {
    const dias = [];
    const hoje = new Date();

    for (let indice = 0; indice < 30; indice += 1) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + indice);
        const dataISO = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
        const horariosDisponiveis = gerarHorariosDisponiveis(areaId, dataISO, reservaEditandoId);

        if (horariosDisponiveis.length > 0) {
            dias.push({
                data: dataISO,
                horarios: horariosDisponiveis
            });
        }
    }

    return dias;
}

function iniciarEdicaoReserva(reservaId) {
    const reserva = reservasCache[reservaId];
    if (!reserva) return;

    const area = obterAreaDaReserva(reserva);
    if (!reservaPodeSerEditada(reserva, area)) {
        showToast("Esta reserva não pode mais ser editada.", "error");
        return;
    }

    const campoArea = document.getElementById("area");
    const campoData = document.getElementById("data");
    const campoInicio = document.getElementById("inicio");
    const campoFim = document.getElementById("fim");
    const campoReservaId = document.getElementById("reserva_id");
    const botaoSalvar = document.getElementById("btnSalvar");
    const tituloFormulario = document.querySelector("section .bg-surface-container-lowest h3");

    if (campoArea) campoArea.value = String(reserva.area_id);
    if (campoData) campoData.value = normalizarData(reserva.data_reserva);
    if (campoInicio) campoInicio.value = String(reserva.horario_inicio).substring(0, 5);
    if (campoFim) campoFim.value = String(reserva.horario_fim).substring(0, 5);
    if (campoReservaId) campoReservaId.value = String(reserva.id);
    if (botaoSalvar) botaoSalvar.innerText = "Salvar Alterações";
    if (tituloFormulario) tituloFormulario.innerText = "Editar Reserva";

    atualizarBotaoDisponibilidade();
    atualizarTextoAreaModal();
    showToast("Reserva carregada para edição.", "success");

    const form = document.getElementById("reservaForm");
    if (form) {
        form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function confirmarCancelamentoReserva(reservaId) {
    return confirm("Deseja cancelar esta reserva?");
}

async function cancelarReserva(reservaId) {
    if (!confirmarCancelamentoReserva(reservaId)) return;

    try {
        const res = await fetch(`/api/reserva/${reservaId}/cancelar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        if (res.ok) {
            showToast("Reserva cancelada com sucesso!", "success");
            cancelarEdicao();
            await carregarMinhasReservas();
        } else {
            const erro = await res.json();
            showToast(erro.detail || "Erro ao cancelar reserva.", "error");
        }
    } catch {
        showToast("Erro de conexão.", "error");
    }
}

function renderizarHorariosDoDia(dia) {
    const container = document.getElementById("listaHorariosDisponiveis");
    const contador = document.getElementById("contadorHorariosDisponiveis");
    const textoDia = document.getElementById("textoDiaSelecionado");

    if (!container || !contador || !textoDia) return;

    if (!dia) {
        container.innerHTML = '<p class="col-span-full rounded-xl border border-dashed border-outline-variant/40 px-4 py-8 text-center text-sm text-on-surface-variant">Selecione um dia.</p>';
        contador.innerText = "0 horários";
        textoDia.innerText = "Selecione um dia";
        return;
    }

    textoDia.innerText = formatarDataBr(dia.data);
    contador.innerText = `${dia.horarios.length} horários`;

    container.innerHTML = dia.horarios.map((horario) => `
        <button type="button" onclick="selecionarHorarioDisponivel('${dia.data}', '${horario.inicio}', '${horario.fim}')" class="rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-3 text-left text-sm font-bold text-on-surface transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary">
            <span class="block text-xs font-medium text-on-surface-variant">Disponível</span>
            <span>${horario.inicio} - ${horario.fim}</span>
        </button>
    `).join("");
}

function selecionarDiaDisponivel(data) {
    diaSelecionadoModal = data;
    const dia = diasDisponiveisModal.find((item) => item.data === data) || null;

    const listaDias = document.getElementById("listaDiasDisponiveis");
    if (listaDias) {
        listaDias.querySelectorAll("button[data-dia]").forEach((button) => {
            const estaSelecionado = button.getAttribute("data-dia") === data;
            button.classList.toggle("bg-primary", estaSelecionado);
            button.classList.toggle("text-white", estaSelecionado);
            button.classList.toggle("border-primary/20", estaSelecionado);
            button.classList.toggle("bg-surface-container-lowest", !estaSelecionado);
            button.classList.toggle("text-on-surface", !estaSelecionado);
        });
    }

    renderizarHorariosDoDia(dia);
}

function renderizarDiasDisponiveis() {
    const container = document.getElementById("listaDiasDisponiveis");
    if (!container) return;

    const areaId = obterAreaSelecionada();
    const reservaEditandoId = obterReservaEditandoId();
    diasDisponiveisModal = gerarDiasDisponiveis(areaId, reservaEditandoId);

    if (diasDisponiveisModal.length === 0) {
        container.innerHTML = '<p class="rounded-xl border border-dashed border-outline-variant/40 px-4 py-8 text-center text-sm text-on-surface-variant">Nenhuma disponibilidade encontrada nos próximos 30 dias.</p>';
        renderizarHorariosDoDia(null);
        return;
    }

    container.innerHTML = diasDisponiveisModal.map((dia) => `
        <button type="button" data-dia="${dia.data}" onclick="selecionarDiaDisponivel('${dia.data}')" class="w-full rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-primary/5">
            <span class="block text-sm font-bold text-on-surface">${formatarDataBr(dia.data)}</span>
            <span class="block text-xs font-medium text-on-surface-variant">${dia.horarios.length} horários livres</span>
        </button>
    `).join("");

    selecionarDiaDisponivel(diasDisponiveisModal[0].data);
}

function selecionarHorarioDisponivel(data, inicio, fim) {
    const campoData = document.getElementById("data");
    const campoInicio = document.getElementById("inicio");
    const campoFim = document.getElementById("fim");

    if (campoData) campoData.value = data;
    if (campoInicio) campoInicio.value = inicio;
    if (campoFim) campoFim.value = fim;

    fecharModalDisponibilidade();
    showToast("Horário aplicado ao formulário.", "success");

    const form = document.getElementById("reservaForm");
    if (form) {
        form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

// ==========================================
// CARREGAMENTO
// ==========================================
async function buscarReservasCondominio() {
    try {
        const res = await fetch("/api/reserva/condominio/ativas");
        if (res.ok) {
            todasReservasCondominio = await res.json();
        } else {
            todasReservasCondominio = [];
        }
    } catch (error) {
        console.error("Erro ao carregar reservas do condomínio.", error);
        todasReservasCondominio = [];
    }
}

async function carregarAreasNoSelect() {
    try {
        const res = await fetch("/api/area/?t=" + new Date().getTime());
        const areas = await res.json();
        const select = document.getElementById("area");

        if (!select) return;

        select.innerHTML = '<option value="">Selecione uma área...</option>';

        areas.forEach((area) => {
            const isAtivo = area.ativo === true || area.ativo === 1;
            areasCache[area.id] = area;

            if (isAtivo) {
                select.innerHTML += `<option value="${area.id}">${area.nome}</option>`;
            }
        });

        atualizarBotaoDisponibilidade();
        await buscarReservasCondominio();
        await carregarMinhasReservas();
    } catch (error) {
        showToast("Erro ao carregar áreas.", "error");
    }
}

async function carregarMinhasReservas() {
    try {
        await buscarReservasCondominio();

        const res = await fetch(`/api/reserva/morador/${MORADOR_ID_SIMULADO}`);
        const reservas = await res.json();
        const container = document.getElementById("listaReservas");

        if (!container) return;

        container.innerHTML = "";
        reservasCache = {};
        const contadorReservas = document.getElementById("contadorReservas");

        if (contadorReservas) {
            contadorReservas.innerText = `${reservas.length} Agendadas`;
        }

        reservas.forEach((reserva) => {
            reservasCache[reserva.id] = reserva;

            const areaAtual = obterAreaDaReserva(reserva);
            const possuiTaxa = areaAtual && (areaAtual.possui_taxa === true || areaAtual.possui_taxa === 1);
            const taxaExibida = possuiTaxa ? formatarMoeda(areaAtual.taxa) : null;
            const statusNormalizado = String(reserva.status || "").toUpperCase();
            const podeEditar = reservaPodeSerEditada(reserva, areaAtual);
            const podeCancelar = reservaPodeSerCancelada(reserva, areaAtual);

            let statusColor = "bg-green-100 text-green-800";
            if (statusNormalizado === "PENDENTE_PAGAMENTO") statusColor = "bg-amber-100 text-amber-800";

            container.innerHTML += `
                <div class="p-4 bg-surface border border-slate-100 rounded-xl shadow-sm flex flex-col gap-2">
                    <div class="flex justify-between items-start gap-4">
                        <div class="flex flex-col gap-1">
                            <span class="font-bold text-slate-800 text-base">${areaAtual ? areaAtual.nome : "Área comum"}</span>
                            <span class="text-sm text-slate-600">${formatarDataBr(reserva.data_reserva)} - ${String(reserva.horario_inicio).substring(0, 5)} até ${String(reserva.horario_fim).substring(0, 5)}</span>
                            ${taxaExibida ? `<span class="text-xs font-semibold text-amber-700">Taxa: ${taxaExibida}</span>` : ""}
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${statusColor}">
                            ${reserva.status}
                        </span>
                    </div>
                    <div class="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100 mt-1">
                        ${podeEditar ? `<button onclick="iniciarEdicaoReserva('${reserva.id}')" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-300 transition-all">Editar</button>` : ""}
                        ${podeCancelar ? `<button onclick="cancelarReserva('${reserva.id}')" class="px-4 py-2 bg-red-50 text-red-700 font-bold rounded-lg text-xs hover:bg-red-100 transition-all">Cancelar</button>` : ""}
                        ${statusNormalizado === "PENDENTE_PAGAMENTO"
                            ? `<button onclick="confirmarPagamentoReserva('${reserva.id}')" class="px-4 py-2 bg-primary text-white font-bold rounded-lg text-xs hover:opacity-90 transition-all">Paguei</button>`
                            : ""
                        }
                    </div>
                </div>
            `;
        });

        atualizarBotaoDisponibilidade();
    } catch (error) {
        showToast("Erro ao carregar reservas.", "error");
    }
}

function cancelarEdicao() {
    const form = document.getElementById("reservaForm");
    if (!form) return;

    form.reset();

    const inputReservaId = document.getElementById("reserva_id");
    if (inputReservaId) inputReservaId.value = "";

    const botaoSalvar = document.getElementById("btnSalvar");
    if (botaoSalvar) botaoSalvar.innerText = "Confirmar Reserva";

    const tituloFormulario = document.querySelector("section .bg-surface-container-lowest h3");
    if (tituloFormulario) tituloFormulario.innerText = "Fazer Reserva";

    fecharModalDisponibilidade();
    atualizarBotaoDisponibilidade();
}

// ==========================================
// SUBMIT (COM TODAS AS VALIDAÇÕES)
// ==========================================
const form = document.getElementById("reservaForm");

if (form) {
    const selectArea = document.getElementById("area");
    const botaoDisponibilidade = document.getElementById("btnAbrirDisponibilidade");
    const modalDisponibilidade = document.getElementById("modalDisponibilidade");

    if (selectArea) {
        selectArea.addEventListener("change", () => {
            atualizarBotaoDisponibilidade();
            atualizarTextoAreaModal();
        });
    }

    if (botaoDisponibilidade) {
        botaoDisponibilidade.addEventListener("click", abrirModalDisponibilidade);
    }

    if (modalDisponibilidade) {
        modalDisponibilidade.addEventListener("click", (event) => {
            if (event.target === modalDisponibilidade) {
                fecharModalDisponibilidade();
            }
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const areaId = document.getElementById("area").value;
        const dataReserva = document.getElementById("data").value;
        const inicio = document.getElementById("inicio").value;
        const fim = document.getElementById("fim").value;
        const reservaId = obterReservaEditandoId();

        if (!areaId) {
            showToast("Selecione uma área.", "error");
            return;
        }

        if (!dataReserva) {
            showToast("Escolha um dia disponível.", "error");
            return;
        }

        if (!inicio || !fim) {
            showToast("Escolha um horário disponível.", "error");
            return;
        }

        if (inicio === fim) {
            showToast("Horários não podem ser iguais.", "error");
            return;
        }

        if (inicio > fim) {
            showToast("Início deve ser menor que o fim.", "error");
            return;
        }

        if (temConflito(inicio, fim, dataReserva, areaId, reservaId)) {
            showToast("Já existe reserva nesse horário.", "error");
            return;
        }

        const data = {
            area_id: parseInt(areaId, 10),
            morador_id: MORADOR_ID_SIMULADO,
            data_reserva: dataReserva,
            horario_inicio: inicio.length === 5 ? `${inicio}:00` : inicio,
            horario_fim: fim.length === 5 ? `${fim}:00` : fim,
            status: "CONFIRMADA",
            valor_pago: 0.0
        };

        const url = reservaId ? `/api/reserva/${reservaId}` : "/api/reserva/";
        const method = reservaId ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                const reservaSalva = await res.json();

                if (String(reservaSalva.status || "").toUpperCase() === "PENDENTE_PAGAMENTO") {
                    showToast(`Reserva salva. Taxa pendente de ${formatarMoeda(reservaSalva.valor_pago)}. Clique em Paguei.`, "success");
                } else {
                    showToast("Reserva salva com sucesso!", "success");
                }

                cancelarEdicao();
                await carregarMinhasReservas();
            } else {
                const erro = await res.json();
                showToast(erro.detail || "Erro ao salvar.", "error");
            }
        } catch {
            showToast("Erro de conexão.", "error");
        }
    });
}

async function confirmarPagamentoReserva(id) {
    try {
        const res = await fetch(`/api/reserva/${id}/paguei`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        if (res.ok) {
            showToast("Pagamento confirmado com sucesso!", "success");
            await carregarMinhasReservas();
        } else {
            const erro = await res.json();
            showToast(erro.detail || "Erro ao confirmar pagamento.", "error");
        }
    } catch {
        showToast("Erro de conexão.", "error");
    }
}

// ==========================================
// INIT
// ==========================================
atualizarBotaoDisponibilidade();
carregarAreasNoSelect();