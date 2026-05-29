let areasCache = {};


async function carregarAreas(){

    try{

        const res =
            await fetch("/api/area/?t=" + Date.now());

        const areas =
            await res.json();
        console.log("Áreas recebidas:", areas);

        const lista =
            document.getElementById("listaAreas");

        lista.innerHTML = "";

        areasCache = {};


        areas.forEach(area => {

            areasCache[area.id] = area;

            const ativo =
                area.ativo;

            lista.innerHTML += `

<tr class="
border-b
transition
${
    ativo
    ? 'bg-white opacity-100'
    : 'bg-red-50 opacity-60'
}">

    <td class="py-4">
        ${area.nome}
    </td>

    <td>
        ${
            area.possui_taxa
            ? "R$ " + area.taxa
            : "Grátis"
        }
    </td>

    <td>
        S:${area.limite_semanal}
        /
        M:${area.limite_mensal}
    </td>

    <td class="text-right space-x-4">

        <button
        onclick="preencherFormulario(${area.id})"
        class="text-blue-600">

            Editar

        </button>

        <button
        onclick="alternarStatus(${area.id})"
        class="${
            ativo
            ? 'text-red-600'
            : 'text-green-600'
        }">

            ${
                ativo
                ? 'Desativar'
                : 'Ativar'
            }

        </button>

    </td>

</tr>

`;
        });

    }

    catch(err){

        console.log(err);

    }

}



function preencherFormulario(id){

    const area =
        areasCache[id];

    if(!area)
        return;


    area_id.value =
        area.id;

    nome.value =
        area.nome;

    descricao.value =
        area.descricao;

    possui_taxa.checked =
        area.possui_taxa;

    taxa.value =
        area.taxa;

    limite_semanal.value =
        area.limite_semanal;

    limite_mensal.value =
        area.limite_mensal;

    limite_cancelamento_edicao_dias.value =
        area.limite_cancelamento_edicao_dias;

}



function cancelarEdicao(){

    formArea.reset();

    area_id.value =
        "";

}




formArea.addEventListener(
"submit",

async(e)=>{

    e.preventDefault();


    mensagemErro.classList.add("hidden");
    mensagemSucesso.classList.add("hidden");


    const id =
        area_id.value;


    const data={

        nome:nome.value,

        descricao:descricao.value,

        possui_taxa:
            possui_taxa.checked,

        taxa:
            parseFloat(taxa.value)||0,

        limite_semanal:
            parseInt(limite_semanal.value)||0,

        limite_mensal:
            parseInt(limite_mensal.value)||0,

        limite_cancelamento_edicao_dias:
            parseInt(
                limite_cancelamento_edicao_dias.value
            )||0,

        ativo: id
            ? areasCache[id].ativo
            : true
    };


    const url =
        id
        ? `/api/area/${id}`
        : "/api/area/";


    const method =
        id
        ? "PUT"
        : "POST";


    try{

        const resposta =
            await fetch(url,{

                method,

                headers:{
                    "Content-Type":
                    "application/json"
                },

                body:
                    JSON.stringify(data)

            });


        if(!resposta.ok){

            const erro =
                await resposta.json();

            mensagemErro.innerText =
                erro.detail ||
                "Erro ao salvar";

            mensagemErro.classList.remove(
                "hidden"
            );

            return;
        }


        mensagemSucesso.innerText =
            "Área salva com sucesso";

        mensagemSucesso.classList.remove(
            "hidden"
        );


        cancelarEdicao();

        carregarAreas();

    }

    catch(err){

        mensagemErro.innerText =
            "Erro de conexão";

        mensagemErro.classList.remove(
            "hidden"
        );

        console.log(err);

    }

});

async function alternarStatus(id){

    await fetch(

        `/api/area/${id}/status`,

        {
            method:"PATCH"
        }

    );

    carregarAreas();

}


carregarAreas();