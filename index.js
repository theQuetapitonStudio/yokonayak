let roteiro = [];
let fila = [];
let finalizado = false;
let carregado = false;
let rodando = false

const musicas = {
    sm: new Audio("./music/SMMP3.mp3"),
}

const sons = {
    ups: new Audio("./sound/ups.mp3")
}

const menu = {
    root: document.getElementById("menu"),
    playbtn: document.getElementById("playbtn"),
    creditosbtn: document.getElementById("crbtn")
};

const game = {
    root: document.getElementById("game"),
    continuebtn: document.getElementById("continuebtn"),
    txt: document.getElementById("texto")
};


// ==========================================================
// ESCOLHAS
// ==========================================================

const escolhas = document.createElement("div");

escolhas.id = "escolhas";

game.root.appendChild(escolhas);

const mecanicaUI = document.createElement("div");
mecanicaUI.id = "mecanica";
mecanicaUI.style.display = "none";
game.root.appendChild(mecanicaUI);

const estiloMecanicas = document.createElement("style");

estiloMecanicas.textContent = `
#mecanica {
    width: min(90%, 520px);
    margin: 24px auto;
    padding: 20px;
    box-sizing: border-box;
    border: 1px solid #373747;
    border-radius: 12px;
    background: #101018;
    color: #f4f4ff;
    text-align: center;
}

#mecanica button,
#mecanica input {
    margin: 6px;
    padding: 10px 14px;
    border: 1px solid #414158;
    border-radius: 7px;
    background: #202033;
    color: white;
    font-size: 16px;
}

#mecanica button { cursor: pointer; }
#mecanica button:hover { background: #393952; }

#mecanica .barra {
    position: relative;
    height: 24px;
    margin: 25px 0;
    overflow: hidden;
    border-radius: 6px;
    background: #292936;
}

#mecanica .zona-verde {
    position: absolute;
    left: 40%;
    width: 20%;
    height: 100%;
    background: #20d879;
}

#mecanica .indicador {
    position: absolute;
    top: 0;
    left: 0;
    width: 5px;
    height: 100%;
    background: white;
    box-shadow: 0 0 10px white;
}

#mecanica .simbolos {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 20px 0;
}

#mecanica .simbolo {
    min-width: 42px;
    font-size: 25px;
    padding: 12px;
    border-radius: 8px;
    background: #25253a;
}

#mecanica .resultado {
    margin-top: 16px;
    font-weight: bold;
}
`;

document.head.appendChild(estiloMecanicas);


// ==========================================================
// CARREGAR ROTEIRO
// ==========================================================

async function carregarRoteiro() {

    const resposta = await fetch("roteiro.txt", {
        cache: "no-store"
    });

    if (!resposta.ok) {
        throw new Error("Erro ao carregar roteiro.txt");
    }

    const texto = await resposta.text();

    roteiro = parseRoteiro(texto);

    carregado = true;

    console.log("ROTEIRO:", roteiro);
}


// ==========================================================
// PARSER
// ==========================================================

function parseRoteiro(texto) {

    const linhas = texto
        .replace(/\r/g, "")
        .split("\n")
        .map(x => x.trim())
        .filter(x => x !== "");

    const resultado = [];

    let i = 0;

    while (i < linhas.length) {

        const linha = linhas[i];


        // ATO
        if (/^\{ATO\s+\d+\}$/i.test(linha)) {
            sons.ups.play()

            i++;
            continue;
        }


        // FINAL
        const final = linha.match(
            /^\[Final\s+"(.*?)"\]$/i
        );

        if (final) {

            resultado.push({
                tipo: "final",
                nome: final[1]
            });

            i++;
            continue;
        }


        // ESCOLHA
        if (/^\[[A-Za-z]\]\s+/.test(linha)) {

            const resultadoEscolha =
                parseEscolha(linhas, i);

            resultado.push(
                resultadoEscolha.evento
            );

            i = resultadoEscolha.proximo;

            continue;
        }

        // MECÂNICA

        const mecanica = parseMecanica(linha);

        if (mecanica) {
            resultado.push(mecanica);
            i++;
            continue;
        }

        if (linha.includes("[FINAL: ")) {
            alert("Você conseguiu um final auternativo")
        }
        if (linha.includes("ATO")) {
            
        }


        // FALA
        const fala = linha.match(
            /^([^:]+):\s*"([\s\S]*)"$/
        );

        if (fala) {

            resultado.push({
                tipo: "fala",
                personagem: fala[1].trim(),
                texto: fala[2]
            });

            i++;
            continue;
        }


        // NARRAÇÃO
        resultado.push({
            tipo: "texto",
            texto: linha
        });

        i++;
    }

    return resultado;
}


// ==========================================================
// PARSER DE ESCOLHA
// ==========================================================

function parseEscolha(linhas, inicio) {

    let i = inicio;

    const opcoes = [];


    // PEGAR A/B/C/D...
    while (
        i < linhas.length &&
        /^\[[A-Za-z]\]\s+/.test(linhas[i])
    ) {

        const match = linhas[i].match(
            /^\[([A-Za-z])\]\s+(.+)$/
        );

        opcoes.push({
            id: match[1].toLowerCase(),
            texto: match[2]
        });

        i++;
    }


    const branches = {};
    let corretos = [];


    // PEGAR IFs
    while (
        i < linhas.length &&
        /^if\s*\(/i.test(linhas[i])
    ) {

        const match = linhas[i].match(
            /^if\s*\((.*?)\)\s*\{(.*)$/i
        );

        if (!match)
            break;

        const condicao = match[1].trim();

        let resto = match[2].trim();

        i++;

        const conteudo = [];


        // IF DE UMA LINHA
        if (resto !== "}") {

            if (resto.endsWith("}")) {

                resto = resto
                    .slice(0, -1)
                    .trim();

                if (resto)
                    conteudo.push(resto);

            } else {

                conteudo.push(resto);

                let nivel = 1;

                while (
                    i < linhas.length &&
                    nivel > 0
                ) {

                    const atual = linhas[i];

                    if (atual === "}") {

                        nivel--;
                        i++;

                        if (nivel === 0)
                            break;

                        continue;
                    }

                    conteudo.push(atual);

                    i++;
                }
            }
        }


        const ids =
            extrairCondicoes(condicao);


        // IF CORRETO
        if (
            conteudo.length === 1 &&
            /^\(correto\)$/i.test(
                conteudo[0]
            )
        ) {

            if (ids === "*") {

                corretos = ["*"];

            } else {

                corretos.push(...ids);
            }

            continue;
        }


        // BRANCH NORMAL
        const branch =
            parseRoteiro(
                conteudo.join("\n")
            );


        if (ids === "*") {

            branches["*"] = branch;

        } else {

            for (const id of ids) {

                branches[id] = branch;
            }
        }
    }


    return {

        evento: {
            tipo: "escolha",
            opcoes,
            branches,
            corretos
        },

        proximo: i
    };
}


function executarMecanica(nome) {
    mecanicaUI.innerHTML = "";
    mecanicaUI.style.display = "block";
    escolhas.style.display = "none";
    game.continuebtn.style.display = "none";

    const titulo = document.createElement("h3");
    titulo.textContent = {
        timing: "TIMING",
        reflexo: "TESTE DE REFLEXO",
        sequencia: "SEQUÊNCIA",
        matematica: "DESAFIO MATEMÁTICO",
        memoria: "MEMÓRIA VISUAL"
    }[nome];

    mecanicaUI.appendChild(titulo);

    function elemento(tag, texto, classe) {
        const el = document.createElement(tag);
        if (texto !== undefined) el.textContent = texto;
        if (classe) el.className = classe;
        mecanicaUI.appendChild(el);
        return el;
    }

    function terminarMecanica(mensagem) {
        mecanicaUI.innerHTML = "";
        mecanicaUI.style.display = "none";
        mostrarTexto(mensagem);
    }

    function resultado(ok, mensagem) {
        mecanicaUI.innerHTML = "";

        const texto = elemento(
            "p",
            mensagem,
            "resultado"
        );

        texto.style.color = ok ? "#20d879" : "#ff646e";

        const botao = elemento("button", "Continuar");

        botao.onclick = () => {
            mecanicaUI.style.display = "none";
            executarProximo();
        };
    }

    // 1. TIMING: ENTER NA ZONA VERDE
    if (nome === "timing") {
        elemento("p", "Aperte ENTER quando o indicador estiver no verde!");

        const barra = elemento("div", undefined, "barra");
        const zona = document.createElement("div");
        zona.className = "zona-verde";
        barra.appendChild(zona);

        const indicador = document.createElement("div");
        indicador.className = "indicador";
        barra.appendChild(indicador);

        let posicao = 0;
        let direcao = 1;
        let ativo = true;

        const intervalo = setInterval(() => {
            posicao += direcao * 1.4;

            if (posicao >= 99) {
                posicao = 99;
                direcao = -1;
            }

            if (posicao <= 0) {
                posicao = 0;
                direcao = 1;
            }

            indicador.style.left = posicao + "%";
        }, 20);

        function tecla(e) {
            if (e.code !== "Enter" || !ativo) return;

            e.preventDefault();
            ativo = false;
            clearInterval(intervalo);
            window.removeEventListener("keydown", tecla);

            const acertou = posicao >= 40 && posicao <= 60;

            resultado(
                acertou,
                acertou ? "ACERTOU!" : "ERROU! O indicador estava fora do verde."
            );
        }

        window.addEventListener("keydown", tecla);
        return;
    }

    // 2. REFLEXO: ESPERAR O SINAL
    if (nome === "reflexo") {
        elemento("p", "Espere o sinal verde. Não aperte antes!");

        const sinal = elemento("h2", "AGUARDE...");
        sinal.style.color = "#ff646e";

        let ativo = true;
        let pronto = false;
        let inicio = 0;

        const atraso = 1500 + Math.random() * 3000;

        const timeout = setTimeout(() => {
            if (!ativo) return;

            pronto = true;
            inicio = performance.now();
            sinal.textContent = "APERTE ENTER!";
            sinal.style.color = "#20d879";
        }, atraso);

        function tecla(e) {
            if (e.code !== "Enter" || !ativo) return;

            e.preventDefault();
            ativo = false;
            clearTimeout(timeout);
            window.removeEventListener("keydown", tecla);

            if (!pronto) {
                resultado(false, "FALHOU! Você apertou cedo demais.");
                return;
            }

            const tempo = Math.round(performance.now() - inicio);

            resultado(
                true,
                `Você reagiu em ${tempo} ms!`
            );
        }

        window.addEventListener("keydown", tecla);
        return;
    }

    // 3. SEQUÊNCIA: REPETIR AS TECLAS
    if (nome === "sequencia") {
        const teclas = ["W", "A", "S", "D"];
        const sequencia = Array.from(
            { length: 4 },
            () => teclas[Math.floor(Math.random() * teclas.length)]
        );

        elemento("p", "Memorize a sequência e repita-a!");
        const exibicao = elemento("h2", sequencia.join(" → "));

        let ativa = false;
        let indice = 0;
        let encerrado = false;

        const botao = elemento("button", "Começar");
        const progresso = elemento("p", "Memorize!");

        botao.onclick = () => {
            botao.remove();
            exibicao.textContent = "Digite a sequência!";
            progresso.textContent = "0 / " + sequencia.length;
            ativa = true;
        };

        function tecla(e) {
            if (!ativa || encerrado) return;

            const teclaPressionada = e.key.toUpperCase();

            if (!teclas.includes(teclaPressionada)) return;

            e.preventDefault();

            if (teclaPressionada !== sequencia[indice]) {
                encerrado = true;
                window.removeEventListener("keydown", tecla);
                resultado(false, "Sequência errada!");
                return;
            }

            indice++;
            progresso.textContent = `${indice} / ${sequencia.length}`;

            if (indice === sequencia.length) {
                encerrado = true;
                window.removeEventListener("keydown", tecla);
                resultado(true, "Sequência completa!");
            }
        }

        window.addEventListener("keydown", tecla);
        return;
    }

    // 4. MATEMÁTICA
    if (nome === "matematica") {
        const operadores = ["+", "-", "*"];
        const operador = operadores[
            Math.floor(Math.random() * operadores.length)
        ];

        const a = Math.floor(Math.random() * 20) + 1;
        const b = Math.floor(Math.random() * 12) + 1;

        const respostaCorreta =
            operador === "+" ? a + b :
            operador === "-" ? a - b :
            a * b;

        elemento("p", "Resolva a conta:");

        elemento(
            "h2",
            `${a} ${operador === "*" ? "×" : operador} ${b} = ?`
        );

        const input = elemento("input");
        input.type = "number";
        input.placeholder = "Sua resposta";
        input.autocomplete = "off";

        const botao = elemento("button", "Responder");

        let encerrado = false;

        function responder() {
            if (encerrado || input.value.trim() === "") return;

            encerrado = true;

            resultado(
                Number(input.value) === respostaCorreta,
                Number(input.value) === respostaCorreta
                    ? "Resposta correta!"
                    : `Resposta errada! Era ${respostaCorreta}.`
            );
        }

        botao.onclick = responder;

        input.addEventListener("keydown", e => {
            if (e.key === "Enter") responder();
        });

        input.focus();
        return;
    }

    // 5. MEMÓRIA VISUAL
    if (nome === "memoria") {
        const simbolos = ["◆", "●", "▲", "★", "■", "♥", "✦", "⬟"];

        const sorteados = [...simbolos]
            .sort(() => Math.random() - 0.5)
            .slice(0, 4);

        elemento("p", "Memorize os símbolos que aparecerem!");

        const painel = elemento("div", undefined, "simbolos");
        painel.style.minHeight = "55px";

        for (const simbolo of sorteados) {
            const item = document.createElement("span");
            item.className = "simbolo";
            item.textContent = simbolo;
            painel.appendChild(item);
        }

        const instrucoes = elemento("p", "Observe...");
        const botoes = [];

        setTimeout(() => {
            painel.innerHTML = "";
            instrucoes.textContent = "Selecione os 4 símbolos que viu:";

            const alternativas = [...simbolos]
                .sort(() => Math.random() - 0.5);

            let selecionados = [];

            for (const simbolo of alternativas) {
                const botao = document.createElement("button");
                botao.textContent = simbolo;

                botao.onclick = () => {
                    if (selecionados.includes(simbolo)) {
                        selecionados = selecionados.filter(
                            x => x !== simbolo
                        );
                        botao.style.background = "#202033";
                    } else {
                        if (selecionados.length >= 4) return;

                        selecionados.push(simbolo);
                        botao.style.background = "#414158";
                    }

                    confirmar.disabled = selecionados.length !== 4;
                };

                painel.appendChild(botao);
                botoes.push(botao);
            }

            const confirmar = elemento("button", "Confirmar");
            confirmar.disabled = true;

            confirmar.onclick = () => {
                const acertou =
                    selecionados.every(x => sorteados.includes(x)) &&
                    sorteados.every(x => selecionados.includes(x));

                resultado(
                    acertou,
                    acertou
                        ? "Memória perfeita!"
                        : "Você não lembrou todos os símbolos."
                );
            };
        }, 1800);

        return;
    }
}

function parseMecanica(linha) {
    const match = linha.match(
        /^\[MECANICA\s+(timing|reflexo|sequencia|matematica|memoria)\]$/i
    );

    if (!match) return null;

    return {
        tipo: "mecanica",
        mecanica: match[1].toLowerCase()
    };
}

// ==========================================================
// INTERPRETAR IF
// ==========================================================

function extrairCondicoes(condicao) {

    condicao = condicao
        .replace(/[{}]/g, "")
        .trim()
        .toLowerCase();


    if (
        condicao === "qualquer" ||
        condicao.includes("qualquercoisa")
    ) {
        return "*";
    }


    return condicao
        .split("&&")
        .map(x => x.trim())
        .filter(Boolean);
}




// ==========================================================
// MOSTRAR TEXTO
// ==========================================================

function mostrarTexto(texto) {

    escolhas.style.display = "none";

    game.continuebtn.style.display =
        "block";

    game.txt.textContent = texto;
}


// ==========================================================
// MOSTRAR ESCOLHAS
// ==========================================================

function mostrarEscolhas(evento) {

    escolhas.innerHTML = "";

    escolhas.style.display = "flex";

    game.continuebtn.style.display =
        "none";


    for (const opcao of evento.opcoes) {

        const botao =
            document.createElement("button");

        botao.textContent =
            `[${opcao.id.toUpperCase()}] ${opcao.texto}`;


        botao.onclick = () => {

            escolher(evento, opcao.id);
        };


        escolhas.appendChild(botao);
    }
}


// ==========================================================
// ESCOLHER
// ==========================================================

function escolher(evento, id) {

    escolhas.style.display = "none";

    game.continuebtn.style.display =
        "block";


    const branch =
        evento.branches[id] ||
        evento.branches["*"];


    // TEM BRANCH
    if (branch) {

        fila = [
            ...branch,
            ...fila
        ];

        executarProximo();

        return;
    }


    // É CORRETO
    if (
        evento.corretos.includes("*") ||
        evento.corretos.includes(id)
    ) {

        executarProximo();

        return;
    }


    // ESCOLHA SEM BRANCH
    executarProximo();
}


// ==========================================================
// EXECUTAR PRÓXIMO
// ==========================================================

function executarProximo() {

    if (finalizado)
        return;


    if (fila.length === 0) {

        terminar();

        return;
    }


    const evento = fila.shift();


    // TEXTO
    if (evento.tipo === "texto") {

        mostrarTexto(
            evento.texto
        );

        return;
    }


    // FALA
    if (evento.tipo === "fala") {

        mostrarTexto(
            evento.personagem +
            ": " +
            evento.texto
        );

        return;
    }


    // ESCOLHA
    if (evento.tipo === "escolha") {

        mostrarEscolhas(evento);

        return;
    }

    if (evento.tipo === "mecanica") {
        executarMecanica(evento.mecanica)
        return
    }
    // FINAL
    if (evento.tipo === "final") {

        alert("Reiniciando...")
        window.location.reload()

        return;
    }
}


// ==========================================================
// CONTINUAR
// ==========================================================

game.continuebtn.onclick = () => {
    if (!rodando) return
    if (finalizado)
        return;

    executarProximo();
};


// ==========================================================
// FINAL
// ==========================================================

function obterFinal(nome) {

    finalizado = true;

    escolhas.style.display =
        "none";

    game.continuebtn.style.display =
        "none";


    console.log(
        "FINAL OBTIDO:",
        nome
    );


    alert(
        "Você conseguiu um final, reiniciando..."
    );


    reiniciar();
}


// ==========================================================
// REINICIAR
// ==========================================================

function reiniciar() {

    finalizado = false;

    fila = [
        ...roteiro
    ];

    escolhas.innerHTML = "";

    escolhas.style.display =
        "none";

    game.continuebtn.style.display =
        "block";


    executarProximo();
}


// ==========================================================
// FIM DO ROTEIRO
// ==========================================================

function terminar() {

    game.continuebtn.style.display =
        "none";

    game.txt.textContent =
        "FIM DO JOGO!";
}


// ==========================================================
// PLAY
// ==========================================================

menu.playbtn.onclick = async () => {
    rodando = true
    menu.root.style.display =
        "none";

    game.root.style.display =
        "block";

    musicas.pmpc.loop = true
    musicas.pmpc.volume = 0.5
    musicas.pmpc.play()


    try {

        if (!carregado) {
            await carregarRoteiro();
        }

        reiniciar();

    } catch (erro) {

        console.error(erro);

        game.txt.textContent =
            "Erro ao carregar roteiro.txt";
    }
};