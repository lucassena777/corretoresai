// Assistente virtual — copiloto do corretor, ancorado no canto esquerdo.
//
// Antes de enviar a pergunta, consulta a base de conhecimento local
// (conhecimento.js) e leva os verbetes relevantes junto. É o que faz o
// assistente responder sobre a plataforma com o texto certo na mão, em vez de
// deduzir como o site funciona.
//
// O navegador nunca vê a chave da API: ele fala com a Edge Function do projeto
// Supabase (assets/config.js), que guarda a chave e conversa com o modelo.

const assistente = (() => {
  const SUGESTOES = [
    "Como responder uma objeção de preço alto?",
    "Me explique como funciona o Calendário Editorial da plataforma.",
    "Crie um e-mail formal para enviar uma proposta de imóvel.",
    "Como montar uma estratégia de postagens para um lançamento?"
  ];

  // Etapas do raciocínio, trocadas enquanto a resposta vem. A primeira é
  // substituída pelo que foi realmente encontrado na base de conhecimento.
  const PENSANDO = [
    "Consultando a base de conhecimento…",
    "Analisando dinâmica de mercado…",
    "Verificando a sua agenda…",
    "Formulando estratégia de alta conversão…"
  ];

  // Corta a espera se o back-end pendurar a conexão sem mandar nada.
  const TEMPO_LIMITE = 180000;

  let aberto = false;
  let ocupado = false;
  let conversa = [];
  let painel = null;
  let timerPensando = null;
  let etapas = [...PENSANDO];

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
    botao.setAttribute("aria-label", "Abrir o copiloto");
    botao.innerHTML = `<svg><use href="#i-assistente" /></svg><span>Copiloto</span>`;
    botao.addEventListener("click", alternar);
    document.body.appendChild(botao);

    painel = document.createElement("section");
    painel.className = "assist-painel";
    painel.hidden = true;
    painel.innerHTML = `
      <header class="assist-topo">
        <span class="icon-tile is-gold"><svg><use href="#i-assistente" /></svg></span>
        <div>
          <strong>Copiloto CorretoresAI</strong>
          <span>Plataforma, mercado e criação</span>
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

      const abrirItem = event.target.closest("[data-abrir-item]");
      if (abrirItem) {
        ui.openItem(abrirItem.dataset.abrirItem);
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
    etapas = [...PENSANDO];
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
          <p>Conheço a plataforma inteira e o mercado imobiliário. Pergunte sobre negociação, objeção, documentação, e-mail para cliente, estratégia de postagem — ou sobre como usar qualquer tela daqui.</p>
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
            ${m.texto ? formatar(m.texto) : `<p class="assist-pensando"><i></i><i></i><i></i> <span data-pensando>${etapas[0]}</span></p>`}
            ${(m.acoes ?? []).map(cartaoAcao).join("")}
          </div>
          ${m.texto && !m.parcial && m.fontes?.length
            ? `<p class="assist-fontes">
                 <svg><use href="#i-book" /></svg> Base consultada: ${m.fontes.join(" · ")}
               </p>`
            : ""}
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
      n = (n + 1) % etapas.length;
      alvo.textContent = etapas[n];
    }, 2600);
  }

  /* ---------------- Conversa ---------------- */

  function contexto() {
    const p = store.perfil;
    return {
      nome: p.nome, creci: p.creci, cidade: p.cidade, imobiliaria: p.imobiliaria,
      areas: p.areas, bio: p.bio, tom: p.tom, plano: store.plano.label,
      // Sem isto o modelo não resolve "dia 20" nem "semana que vem".
      hoje: toIso(HOJE)
    };
  }

  /* ---------------- Ações ----------------
     O modelo decide; quem executa é aqui, no aparelho do corretor, direto no
     store da conta dele. */

  function executarAcao(nome, entrada = {}) {
    if (nome !== "agendar_conteudo") {
      return { ok: false, erro: `Ação desconhecida: ${nome}` };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(entrada.data ?? "")) {
      return { ok: false, erro: "A data veio em um formato que não consegui usar." };
    }

    try {
      const dados = {
        area: entrada.area || store.perfil.areas[0] || AREAS[0],
        cidade: entrada.cidade || store.perfil.cidade,
        briefing: entrada.tema || "",
        funnel: entrada.funil || store.config.funilPadrao,
        format: entrada.formato || store.config.formatoPadrao,
        date: entrada.data,
        // A hora só vem quando o corretor pediu ("às 14h"); senão, o padrão.
        time: /^\d{1,2}:\d{2}$/.test(entrada.horario ?? "")
          ? entrada.horario.padStart(5, "0")
          : store.config.horarioPadrao
      };

      // Quando o pedido trouxe a cidade, ela manda: sem apagar a do perfil, o
      // texto.js leria "Atibaia" como bairro de Campinas e gravaria
      // "Campinas - Atibaia". O resto do perfil (nome, CRECI, tom) continua.
      const perfil = entrada.cidade
        ? { ...store.perfil, cidade: "" }
        : store.perfil;

      // O roteiro sai da engine local: agendar tem que ser instantâneo. O
      // corretor regera pela IA depois, no editor, se quiser.
      const [ideia] = roteiro.gerarIdeias(dados, perfil, Date.now());
      const { angulo, rotulo, origem, ...limpo } = ideia;
      const item = store.criar({ ...limpo, status: "agendado" });

      return { ok: true, id: item.id, titulo: item.title, data: item.date, hora: item.time };
    } catch (e) {
      console.error("[CorretoresAI] falha ao executar a ação:", e);
      return { ok: false, erro: e.message };
    }
  }

  function cartaoAcao(acao) {
    if (!acao.ok) {
      return `<p class="assist-acao is-falha">${icone("i-close")} Não consegui agendar: ${acao.erro}</p>`;
    }
    return `
      <div class="assist-acao">
        <span class="icon-tile is-gold">${icone("i-calendar-clock")}</span>
        <div>
          <strong>Agendado para ${formatFull(acao.data)}, às ${acao.hora}</strong>
          <span>${acao.titulo}</span>
        </div>
        <button type="button" data-abrir-item="${acao.id}">Abrir</button>
      </div>`;
  }

  const icone = (id) => `<svg><use href="#${id}" /></svg>`;

  async function enviar(event) {
    event.preventDefault();
    if (ocupado) return;

    const campo = painel.querySelector("[data-campo]");
    const pergunta = campo.value.trim();
    if (!pergunta) return;

    campo.value = "";
    campo.style.height = "auto";

    // Recuperação: o que a base local tem a ver com esta pergunta.
    const base = conhecimento.contexto(pergunta);
    etapas = base
      ? [`Consultando: ${base.fontes.join(", ")}…`, ...PENSANDO.slice(1)]
      : [...PENSANDO];

    conversa.push({ papel: "usuario", texto: pergunta });
    conversa.push({ papel: "assistente", texto: "", parcial: true, fontes: base?.fontes ?? [] });
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
        },
        base?.texto,
        (acao) => {
          resposta.acoes = resposta.acoes ?? [];
          resposta.acoes.push(executarAcao(acao.nome, acao.entrada));
        }
      );

      if (!resposta.texto.trim()) {
        resposta.texto = resposta.acoes?.some((a) => a.ok)
          ? "Pronto, já está no seu calendário."
          : "Não consegui formular uma resposta. Tente reformular a pergunta.";
      }
    } catch (e) {
      resposta.texto = `**Não deu para responder agora.** ${e.message}`;
      resposta.fontes = [];
    } finally {
      delete resposta.parcial;
      ocupado = false;
      clearInterval(timerPensando);
      painel.classList.remove("is-ocupado");
      guardar();
      render();
    }
  }

  async function streamar(mensagens, aoReceber, base, aoAgir) {
    if (!CONFIG.assistenteUrl || !CONFIG.assistenteChave) {
      throw new Error("O assistente ainda não está conectado ao back-end. Veja o README para configurar.");
    }

    const controle = new AbortController();
    let relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE);
    // Cada pedaço que chega renova o prazo: o limite é de silêncio, não de
    // resposta longa.
    const renovar = () => {
      clearTimeout(relogio);
      relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE);
    };

    try {
      const resposta = await fetch(CONFIG.assistenteUrl, {
        method: "POST",
        signal: controle.signal,
        headers: CONFIG.cabecalhos(),
        body: JSON.stringify({ mensagens, contexto: contexto(), base })
      });

      if (!resposta.ok) throw await CONFIG.erroDaResposta(resposta);

      const leitor = resposta.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await leitor.read();
        if (done) break;
        renovar();

        buffer += decoder.decode(value, { stream: true });
        const blocos = buffer.split("\n\n");
        buffer = blocos.pop() ?? "";

        for (const bloco of blocos) {
          // Linhas ":" são o pulso que segura a conexão; não têm evento.
          const evento = bloco.match(/^event: (.*)$/m)?.[1];
          const dados = bloco.match(/^data: (.*)$/m)?.[1];
          if (!evento || !dados) continue;

          if (evento === "texto") aoReceber(JSON.parse(dados));
          if (evento === "acao") aoAgir?.(JSON.parse(dados));
          if (evento === "erro") throw new Error(JSON.parse(dados).mensagem);
        }
      }
    } catch (e) {
      throw e instanceof TypeError || e.name === "AbortError"
        ? new Error(CONFIG.diagnosticar(e))
        : e;
    } finally {
      clearTimeout(relogio);
    }
  }

  return {
    iniciar() {
      if (!store.logado || painel) return;
      carregar();
      montar();
    },

    // Usado pelo item "Assistente IA" da barra lateral.
    abrir() {
      if (!painel) return;
      if (!aberto) alternar();
      painel.querySelector("[data-campo]").focus();
    }
  };
})();
