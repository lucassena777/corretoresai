// Central de Conteúdo: trata o que foi digitado, gera três ângulos distintos
// e transforma a ideia aprovada em conteúdo de verdade.

function initCentral(root = document) {
  if (!auth.exigirLogin()) return;

  const form = root.querySelector("[data-generator]");
  const elIdeas = root.querySelector("[data-ideas]");
  const elQuota = root.querySelector("[data-quota]");
  const cfg = store.config;

  form.area.innerHTML = AREAS.map((a) => `<option>${a}</option>`).join("");
  form.area.value = cfg.areaPadrao || store.perfil.areas[0] || AREAS[0];
  form.cidade.value = store.perfil.cidade;
  const dataAlvo = routeParams().get("data");

  const marcar = (grupo, valor) => {
    root.querySelectorAll(`[data-choice="${grupo}"] button`).forEach((b) =>
      b.setAttribute("aria-pressed", String(b.textContent.trim() === valor)));
  };
  marcar("funil", cfg.funilPadrao);
  marcar("formato", cfg.formatoPadrao);

  root.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      location.href = SPA ? `#/${btn.dataset.goto.replace(".html", "")}` : btn.dataset.goto;
    });
  });

  // Mostra ao vivo como a cidade digitada vai sair no texto.
  const eco = root.querySelector("[data-eco-cidade]");
  function atualizarEco() {
    if (!eco) return;
    const l = texto.local(form.cidade.value, store.perfil.cidade);
    eco.textContent = l.completo ? `Vai sair como: ${l.completo}` : "";
  }
  form.cidade.addEventListener("input", atualizarEco);
  form.cidade.addEventListener("blur", () => {
    const l = texto.local(form.cidade.value, store.perfil.cidade);
    if (l.completo) form.cidade.value = l.completo;
    atualizarEco();
  });
  atualizarEco();

  function proximaData() {
    if (dataAlvo) return dataAlvo;
    const ocupadas = new Set(store.board().map((i) => i.date));
    const d = new Date(HOJE);
    for (let n = 0; n < 60; n++) {
      const iso = toIso(d);
      if (!ocupadas.has(iso)) return iso;
      d.setDate(d.getDate() + 1);
    }
    return toIso(HOJE);
  }

  function renderQuota() {
    const restantes = store.restantes();
    elQuota.innerHTML = restantes === Infinity
      ? `<svg class="icon"><use href="#i-crown" /></svg> Gerações ilimitadas no seu plano`
      : `<svg class="icon"><use href="#i-sparkle" /></svg> <b>${restantes}</b> de ${store.plano.cota} gerações restantes ·
         <a href="${SPA ? "#/planos" : "planos.html"}" style="color:var(--gold-soft)">ver planos</a>`;
  }

  document.querySelectorAll("[data-choice]").forEach((row) => {
    row.addEventListener("click", (event) => {
      const btn = event.target.closest("button");
      if (!btn) return;
      row.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
    });
  });

  const escolhido = (nome) =>
    root.querySelector(`[data-choice="${nome}"] button[aria-pressed="true"]`)?.textContent.trim() ?? "";

  // ---- Geração -----------------------------------------------------------

  let ideias = [];
  let gerando = false;
  let timerEtapa = null;

  const botaoGerar = form.querySelector("[type=submit]");

  // Frases do carregamento — a geração pela IA leva alguns segundos e a tela
  // precisa contar o que está acontecendo.
  const ETAPAS = [
    "Lendo o briefing e a localização…",
    "Comparando com o que a região oferece…",
    "Escrevendo os três ângulos…",
    "Ajustando ganchos e chamadas…"
  ];

  function mostrarCarregando() {
    elIdeas.innerHTML = `
      <div class="ideias-carregando">
        <span class="icon-tile is-gold"><svg><use href="#i-sparkle" /></svg></span>
        <p data-etapa>${ETAPAS[0]}</p>
        <div class="skeleton-idea"></div>
        <div class="skeleton-idea"></div>
        <div class="skeleton-idea"></div>
      </div>`;

    let n = 0;
    clearInterval(timerEtapa);
    timerEtapa = setInterval(() => {
      const alvo = elIdeas.querySelector("[data-etapa]");
      if (!alvo) return clearInterval(timerEtapa);
      n = (n + 1) % ETAPAS.length;
      alvo.textContent = ETAPAS[n];
    }, 2800);
  }

  function dadosDoForm() {
    return {
      area: form.area.value,
      cidade: form.cidade.value,
      briefing: form.briefing.value,
      funnel: escolhido("funil"),
      format: escolhido("formato"),
      date: proximaData(),
      time: store.config.horarioPadrao
    };
  }

  // Tenta a IA de verdade; se o back-end não responder, cai na engine local
  // para que a Central nunca fique sem gerar.
  async function gerar() {
    const dados = dadosDoForm();

    gerando = true;
    botaoGerar.disabled = true;
    mostrarCarregando();

    try {
      ideias = await roteiro.gerarIdeiasIA(dados, store.perfil);
    } catch (e) {
      ideias = roteiro.gerarIdeias(dados, store.perfil, Date.now());
      ui.toast(`Roteiro montado sem a IA (${e.message})`, "erro");
    } finally {
      gerando = false;
      botaoGerar.disabled = false;
      clearInterval(timerEtapa);
    }

    render();
  }

  function render() {
    if (!ideias.length) { elIdeas.innerHTML = ""; return; }

    const l = texto.local(form.cidade.value, store.perfil.cidade);
    const f = texto.fatos(form.briefing.value);
    const ficha = texto.ficha(f);

    elIdeas.innerHTML = `
      <div class="ideias-head">
        <h2>Três ângulos para o mesmo imóvel
          <span class="selo-origem${ideias[0]?.origem === "ia" ? " is-ia" : ""}">
            ${ideias[0]?.origem === "ia" ? "Escrito pela IA" : "Modelo local"}
          </span>
        </h2>
        <p>
          ${l.completo ? `<b>${l.completo}</b>` : "Sem localização informada"}
          ${ficha ? ` · ${ficha}` : ""}
          ${f.caracteristicas.length ? ` · ${texto.lista(f.caracteristicas.slice(0, 3))}` : ""}
        </p>
      </div>
      ${ideias.map((ideia, n) => `
        <article class="idea" data-idea="${n}">
          <div class="idea-head">
            <span class="icon-tile is-gold"><svg><use href="#${
              ideia.angulo === "analise" ? "i-trend" : ideia.angulo === "estilo" ? "i-eye" : "i-check-circle"
            }" /></svg></span>
            <div>
              <span class="idea-rotulo">${ideia.rotulo}</span>
              <h3>${ideia.title}</h3>
            </div>
          </div>

          <dl class="idea-campos">
            <div><dt>Gancho</dt><dd>${ideia.script.gancho}</dd></div>
            <div><dt>Desenvolvimento</dt><dd>${ideia.script.desenvolvimento.replace(/\n\n/g, "<br /><br />")}</dd></div>
            <div><dt>Chamada</dt><dd>${ideia.script.cta}</dd></div>
          </dl>

          <div class="kan-tags">${ideia.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>

          <div class="idea-actions">
            <button class="btn btn-primary" type="button" data-action="aprovar">
              <svg><use href="#i-check-circle" /></svg>Aprovar e agendar
            </button>
            <button class="btn btn-outline" type="button" data-action="rascunho">Salvar rascunho</button>
            <button class="btn btn-quiet" type="button" data-action="abrir">Ver roteiro completo</button>
          </div>
        </article>`).join("")}`;
  }

  elIdeas.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;

    const ideia = ideias[Number(btn.closest("[data-idea]").dataset.idea)];
    const acao = btn.dataset.action;

    const statusAoAprovar = store.config.agendarAoAprovar ? "agendado" : "aprovado";
    const { angulo, rotulo, origem, ...limpo } = ideia;
    const item = store.criar({ ...limpo, status: acao === "aprovar" ? statusAoAprovar : "rascunho" });

    if (acao === "aprovar") {
      ui.toast(store.config.agendarAoAprovar
        ? `Agendado para ${formatFull(item.date)}.`
        : "Aprovado. Defina a data no calendário quando quiser.");
    } else if (acao === "rascunho") {
      ui.toast("Salvo como rascunho na Biblioteca.");
    } else {
      ui.openItem(item.id);
      return;
    }

    ideias = ideias.filter((i) => i !== ideia);
    render();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (gerando) return;

    if (!store.consumirGeracao()) {
      ui.toast("Você usou todas as gerações do plano. Faça upgrade para continuar.", "erro");
      return;
    }

    gerar();
    elIdeas.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  root.querySelector("[data-limpar]")?.addEventListener("click", () => {
    form.reset();
    form.area.value = cfg.areaPadrao || AREAS[0];
    form.cidade.value = store.perfil.cidade;
    marcar("funil", cfg.funilPadrao);
    marcar("formato", cfg.formatoPadrao);
    atualizarEco();
    ideias = [];
    render();
  });

  store.subscribe(renderQuota);
  renderQuota();

  if (dataAlvo) ui.toast(`Novo conteúdo para ${formatFull(dataAlvo)}.`);
}

if (!SPA) initCentral();
