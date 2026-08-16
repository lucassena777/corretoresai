// Assistente virtual — botão flutuante + painel de conversa na área logada.
//
// O navegador nunca vê a chave da API: ele fala com a Edge Function do projeto
// Supabase (assets/config.js), que guarda a chave e conversa com o modelo.

const assistente = (() => {
  const SUGESTOES = [
    "Como abordar um cliente de alto padrão?",
    "Ajude-me a melhorar este gancho para Stories",
    "O que destacar em um apartamento de 47 m²?",
    "Como responder quem diz que está só pesquisando?"
  ];

  // Frases do indicador de carregamento, trocadas enquanto a resposta vem.
  const PENSANDO = [
    "Analisando estratégia de mercado…",
    "Considerando o perfil do seu cliente…",
    "Ajustando o argumento para a sua região…",
    "Montando a recomendação…"
  ];

  let aberto = false;
  let ocupado = false;
  let conversa = [];
  let painel = null;
  let timerPensando = null;

  const K_CONVERSA = "corretoresai-assistente";

  function carregar() {
    try {
      const salvo = JSON.parse(localStorage.getItem(K_CONVERSA));
      conversa = Array.isArray(salvo) ? salvo.slice(-30) : [];
    } catch { conversa = []; }
  }

  function guardar() {
    try { localStorage.setItem(K_CONVERSA, JSON.stringify(conversa.slice(-30))); } catch { /* ok */ }
  }

  /* ---------------- Markdown mínimo ---------------- */
  // O modelo responde em texto corrido com **negrito**, listas e parágrafos.

  const escapar = (s) => s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function formatar(texto) {
    const linhas = escapar(texto).split("\n");
    let html = "";
    let lista = null;

    const fecharLista = () => { if (lista) { html += `</${lista}>`; lista = null; } };

    for (const linha of linhas) {
      const l = linha.trim();
      if (!l) { fecharLista(); continue; }

      const titulo = l.match(/^#{1,4}\s+(.*)$/);
      if (titulo) { fecharLista(); html += `<h4>${enfase(titulo[1])}</h4>`; continue; }

      const numerada = l.match(/^\d+[.)]\s+(.*)$/);
      if (numerada) {
        if (lista !== "ol") { fecharLista(); html += "<ol>"; lista = "ol"; }
        html += `<li>${enfase(numerada[1])}</li>`;
        continue;
      }

      const marcador = l.match(/^[-*•]\s+(.*)$/);
      if (marcador) {
        if (lista !== "ul") { fecharLista(); html += "<ul>"; lista = "ul"; }
        html += `<li>${enfase(marcador[1])}</li>`;
        continue;
      }

      fecharLista();
      html += `<p>${enfase(l)}</p>`;
    }

    fecharLista();
    return html;
  }

  const enfase = (s) => s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

  /* ---------------- Interface ---------------- */

  function montar() {
    const botao = document.createElement("button");
    botao.className = "assist-botao";
    botao.type = "button";
    botao.setAttribute("aria-label", "Abrir o assistente");
    botao.innerHTML = `<svg><use href="#i-assistente" /></svg>`;
    botao.addEventListener("click", alternar);
    document.body.appendChild(botao);

    painel = document.createElement("section");
    painel.className = "assist-painel";
    painel.hidden = true;
    painel.innerHTML = `
      <header class="assist-topo">
        <span class="icon-tile is-gold"><svg><use href="#i-assistente" /></svg></span>
        <div>
          <strong>Estrategista CorretoresAI</strong>
          <span>Marketing, abordagem e negociação</span>
        </div>
        <button class="assist-limpar" type="button" data-limpar title="Começar do zero">
          <svg><use href="#i-trash" /></svg>
        </button>
        <button class="assist-fechar" type="button" data-fechar aria-label="Fechar">
          <svg><use href="#i-close" /></svg>
        </button>
      </header>

      <div class="assist-corpo" data-corpo></div>

      <form class="assist-envio" data-form>
        <textarea rows="1" placeholder="Escreva sua pergunta…" data-campo></textarea>
        <button class="assist-enviar" type="submit" aria-label="Enviar">
          <svg><use href="#i-arrow" /></svg>
        </button>
      </form>`;

    document.body.appendChild(painel);

    painel.querySelector("[data-fechar]").addEventListener("click", alternar);
    painel.querySelector("[data-limpar]").addEventListener("click", limpar);
    painel.querySelector("[data-form]").addEventListener("submit", enviar);

    const campo = painel.querySelector("[data-campo]");
    campo.addEventListener("input", () => {
      campo.style.height = "auto";
      campo.style.height = `${Math.min(campo.scrollHeight, 132)}px`;
    });
    campo.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        painel.querySelector("[data-form]").requestSubmit();
      }
    });

    painel.addEventListener("click", (event) => {
      const sugestao = event.target.closest("[data-sugestao]");
      if (sugestao) {
        campo.value = sugestao.textContent.trim();
        painel.querySelector("[data-form]").requestSubmit();
        return;
      }

      const copiar = event.target.closest("[data-copiar]");
      if (copiar) {
        const bruto = conversa[Number(copiar.dataset.copiar)]?.texto ?? "";
        navigator.clipboard?.writeText(bruto)
          .then(() => ui.toast("Resposta copiada."))
          .catch(() => ui.toast("Não foi possível copiar.", "erro"));
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && aberto && !document.querySelector(".modal")) alternar();
    });

    render();
  }

  function alternar() {
    aberto = !aberto;
    painel.hidden = !aberto;
    document.body.classList.toggle("assist-aberto", aberto);
    if (aberto) {
      painel.querySelector("[data-campo]").focus();
      rolar();
    }
  }

  function limpar() {
    conversa = [];
    guardar();
    render();
  }

  function render() {
    const corpo = painel.querySelector("[data-corpo]");

    if (!conversa.length) {
      corpo.innerHTML = `
        <div class="assist-vazio">
          <span class="icon-tile"><svg><use href="#i-assistente" /></svg></span>
          <h3>Em que posso ajudar hoje?</h3>
          <p>Pergunte sobre abordagem de cliente, gancho de conteúdo, precificação, negociação ou o básico da parte legal.</p>
          <div class="assist-sugestoes">
            ${SUGESTOES.map((s) => `<button type="button" data-sugestao>${s}</button>`).join("")}
          </div>
        </div>`;
      return;
    }

    corpo.innerHTML = conversa.map((m, n) => {
      if (m.papel === "usuario") {
        return `<div class="assist-msg is-eu"><div class="assist-balao">${formatar(m.texto)}</div></div>`;
      }
      return `
        <div class="assist-msg">
          <div class="assist-balao">
            ${m.texto ? formatar(m.texto) : `<p class="assist-pensando"><i></i><i></i><i></i> <span data-pensando>${PENSANDO[0]}</span></p>`}
          </div>
          ${m.texto && !m.parcial
            ? `<button class="assist-copiar" type="button" data-copiar="${n}">
                 <svg><use href="#i-copy" /></svg> Copiar
               </button>`
            : ""}
        </div>`;
    }).join("");

    rolar();
  }

  function rolar() {
    const corpo = painel.querySelector("[data-corpo]");
    corpo.scrollTop = corpo.scrollHeight;
  }

  function girarPensando() {
    let n = 0;
    clearInterval(timerPensando);
    timerPensando = setInterval(() => {
      const alvo = painel.querySelector("[data-pensando]");
      if (!alvo) return clearInterval(timerPensando);
      n = (n + 1) % PENSANDO.length;
      alvo.textContent = PENSANDO[n];
    }, 2600);
  }

  /* ---------------- Conversa ---------------- */

  function contexto() {
    const p = store.perfil;
    return {
      nome: p.nome, creci: p.creci, cidade: p.cidade, imobiliaria: p.imobiliaria,
      areas: p.areas, bio: p.bio, tom: p.tom, plano: store.plano.label
    };
  }

  async function enviar(event) {
    event.preventDefault();
    if (ocupado) return;

    const campo = painel.querySelector("[data-campo]");
    const pergunta = campo.value.trim();
    if (!pergunta) return;

    campo.value = "";
    campo.style.height = "auto";

    conversa.push({ papel: "usuario", texto: pergunta });
    conversa.push({ papel: "assistente", texto: "", parcial: true });
    ocupado = true;
    painel.classList.add("is-ocupado");
    render();
    girarPensando();

    const resposta = conversa[conversa.length - 1];

    try {
      await streamar(
        conversa.slice(0, -1).map(({ papel, texto }) => ({ papel, texto })),
        (pedaco) => {
          resposta.texto += pedaco;
          const balao = painel.querySelector(".assist-msg:last-child .assist-balao");
          if (balao) balao.innerHTML = formatar(resposta.texto);
          rolar();
        }
      );

      if (!resposta.texto.trim()) {
        resposta.texto = "Não consegui formular uma resposta. Tente reformular a pergunta.";
      }
    } catch (e) {
      resposta.texto = `**Não deu para responder agora.** ${e.message}`;
    } finally {
      delete resposta.parcial;
      ocupado = false;
      clearInterval(timerPensando);
      painel.classList.remove("is-ocupado");
      guardar();
      render();
    }
  }

  async function streamar(mensagens, aoReceber) {
    if (!CONFIG.assistenteUrl || !CONFIG.assistenteChave) {
      throw new Error("O assistente ainda não está conectado ao back-end. Veja o README para configurar.");
    }

    const resposta = await fetch(CONFIG.assistenteUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${CONFIG.assistenteChave}`,
        "apikey": CONFIG.assistenteChave
      },
      body: JSON.stringify({ mensagens, contexto: contexto() })
    });

    if (!resposta.ok) {
      let detalhe = `Erro ${resposta.status}.`;
      try { detalhe = (await resposta.json()).erro ?? detalhe; } catch { /* ok */ }
      throw new Error(detalhe);
    }

    const leitor = resposta.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocos = buffer.split("\n\n");
      buffer = blocos.pop() ?? "";

      for (const bloco of blocos) {
        const evento = bloco.match(/^event: (.*)$/m)?.[1];
        const dados = bloco.match(/^data: (.*)$/m)?.[1];
        if (!evento || !dados) continue;

        if (evento === "texto") aoReceber(JSON.parse(dados));
        if (evento === "erro") throw new Error(JSON.parse(dados).mensagem);
      }
    }
  }

  return {
    iniciar() {
      if (!store.logado || painel) return;
      carregar();
      montar();
    }
  };
})();
