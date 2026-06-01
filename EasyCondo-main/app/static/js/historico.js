// ==========================================
// LÓGICA DA TELA DE HISTÓRICO COMPLETO
// ==========================================
const MORADOR_ID_SIMULADO = 1;
let areasCache = {};

async function carregarAreasEHistorico() {
    try {
        // 1. Alimenta o cache de áreas para converter ID em nome legível
        const resAreas = await fetch("/api/area/?t=" + new Date().getTime()); 
        const areas = await resAreas.json();
        
        areas.forEach(area => {
            areasCache[area.id] = area;
        });

        // 2. Busca e monta a lista completa
        await carregarListaHistoricoCompleta();
    } catch (error) {
        console.error("Erro ao inicializar histórico:", error);
    }
}

async function carregarListaHistoricoCompleta() {
    try {
        const res = await fetch(`/api/reserva/morador/${MORADOR_ID_SIMULADO}`);
        const respostas = await res.json();
        const container = document.getElementById("listaHistorico");

        if (!container) return;

        container.innerHTML = "";
        let totalExibidas = 0;

        const ativas = respostas.ativas || [];
        const historico = respostas.historico || [];

        // Juntamos as duas listas para exibir TUDO no histórico
        const todasReservas = [...ativas, ...historico];

        if (todasReservas.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-slate-400">
                    <span class="material-symbols-outlined text-4xl mb-2">history_toggle_off</span>
                    <p class="text-sm">Você ainda não possui nenhuma reserva registrada.</p>
                </div>`;
            return;
        }

        // Ordena as reservas por data (as mais recentes primeiro)
        todasReservas.sort((a, b) => new Date(b.data_reserva) - new Date(a.data_reserva));

        // Pegamos a data de hoje para identificar o que já passou naturalmente
        const hoje = new Date().toISOString().split('T')[0];

        todasReservas.forEach(r => {
            totalExibidas++;

            // Formatação de data (dd/mm/aaaa)
            let dataFormatada = r.data_reserva;
            if (r.data_reserva && r.data_reserva.includes("-")) {
                const partesData = r.data_reserva.split("-");
                dataFormatada = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;
            }

            // Formatação de horários sem segundos
            const horaInicioFormatada = r.horario_inicio ? r.horario_inicio.substring(0, 5) : "00:00";
            const horaFimFormatada = r.horario_fim ? r.horario_fim.substring(0, 5) : "00:00";

            // Nome da área comum
            const dadosDaArea = areasCache[r.area_id];
            const nomeArea = dadosDaArea ? dadosDaArea.nome : "Área Comum";

            // 🔹 CONFIGURAÇÃO DO BADGE BLINDADA CONTRA ERROS DE CAIXA ALTA/BAIXA
            let badgeCor = "";
            let badgeTexto = "";
            let opacidadeCard = "opacity-80";

            // Convertemos o status para minúsculas para garantir a leitura correta do Enum do banco
            const statusNormalizado = r.status ? String(r.status).toLowerCase() : "";

            if (statusNormalizado === "cancelada") {
                // Se o status retornado for cancelado, ganha o badge rosa/vermelho
                badgeCor = "bg-red-100 text-red-600 border-red-200";
                badgeTexto = "CANCELADA";
                opacidadeCard = "opacity-60"; 
            } else {
                // Se NÃO estiver cancelada, segue o fluxo normal baseado na linha de tempo
                const ehFutura = r.data_reserva >= hoje;
                badgeCor = ehFutura ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-slate-200 text-slate-600 border-slate-300";
                badgeTexto = ehFutura ? "AGENDADA" : "CONCLUÍDA";
                opacidadeCard = ehFutura ? "opacity-100" : "opacity-80";
            }

            container.innerHTML += `
                <div class="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex justify-between items-center text-sm font-medium shadow-sm mb-2 ${opacidadeCard}">
                    <div class="flex flex-col gap-1">
                        <span class="font-bold text-slate-700 text-base">${nomeArea}</span>
                        <div class="flex flex-col gap-0.5 text-slate-600 font-normal">
                            <span class="flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-base text-slate-400">calendar_today</span>
                                ${dataFormatada}
                            </span>
                            <span class="flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-base text-slate-400">schedule</span>
                                das ${horaInicioFormatada} às ${horaFimFormatada}
                            </span>
                        </div>
                    </div>
                    <div>
                        <span class="px-3 py-1 border text-xs font-bold rounded-full uppercase tracking-wider ${badgeCor}">
                            ${badgeTexto}
                        </span>
                    </div>
                </div>
            `;
        });

        // Atualiza o contador total no topo da tabela
        const contadorHistorico = document.getElementById("contadorHistorico");
        if (contadorHistorico) {
            contadorHistorico.innerText = `${totalExibidas} No Total`;
        }

    } catch (error) {
        console.error("Erro ao renderizar lista completa de histórico:", error);
    }
}

// Inicializa a execução
carregarAreasEHistorico();