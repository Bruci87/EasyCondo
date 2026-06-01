// 🔹 CARREGAR SOLICITAÇÕES
async function carregarSolicitacoes() {
    const res = await fetch("/solicitacoes/");
    const data = await res.json();

    const container = document.getElementById("listaSolicitacoes");
    container.innerHTML = "";

    data.forEach(user => {
        const div = document.createElement("div");
        div.classList.add("solicitacao");

        div.innerHTML = `
            <span>${user.nome} (${user.email})</span>
            <div>
                <button class="btn-aprovar" onclick="aprovar(${user.id})">✔</button>
                <button class="btn-negar" onclick="negar(${user.id})">✖</button>
            </div>
        `;

        container.appendChild(div);
    });
}

// 🔹 APROVAR
async function aprovar(id) {
    await fetch(`/solicitacoes/${id}/aprovar`, { method: "PUT" });
    carregarSolicitacoes();
}

// 🔹 NEGAR
async function negar(id) {
    await fetch(`/solicitacoes/${id}/negar`, { method: "PUT" });
    carregarSolicitacoes();
}

// 🔹 FORM ÁREA
const form = document.getElementById("areaForm");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = {
            nome: document.getElementById("nome").value,
            descricao: document.getElementById("descricao").value,
            taxa: parseFloat(document.getElementById("taxa").value) || 0,
            possui_taxa: document.getElementById("possui_taxa").checked,
            antecedencia_minima_horas: parseInt(document.getElementById("antecedencia").value),
            limite_semanal: parseInt(document.getElementById("limite_semanal").value) || 0,
            limite_mensal: parseInt(document.getElementById("limite_mensal").value) || 0,
            tempo_maximo_desistencia_horas: parseInt(document.getElementById("desistencia").value)
        };

        console.log("Área criada:", data);

        alert("Área cadastrada (simulação)");
    });
}

// 🔹 INIT
carregarSolicitacoes();