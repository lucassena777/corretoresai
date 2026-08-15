// Central de Conteúdo: gera ideias, consome a cota do plano e cria conteúdo de verdade.

function initCentral(root = document) {
  if (!auth.exigirLogin()) return;

  const form = root.querySelector("[data-generator]");
  const elIdeas = root.querySelector("[data-ideas]");
  const elQuota = root.querySelector("[data-quota]");
  const cfg = store.config;

  // Preenche a partir das Configurações, do perfil e de ?data= (vindo do calendário).
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
         <a href="../index.html#planos" style="color:var(--gold-soft)">assine o Ilimitado</a>`;
  }

  // ---- Escolhas únicas ---------------------------------------------------

  root.querySelectorAll("[data-choice]").forEach((row) => {
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

  function gerar() {
    const area = form.area.value;
    const cidade = form.cidade.value.trim() || store.perfil.cidade;
    const briefing = form.briefing.value.trim();
    const funnel = escolhido("funil");
    const format = escolhido("formato");
    const semente = Date.now();

    ideias = [0, 1, 2].map((n) => {
      const bruto = pick(TITULOS[funnel], semente + n * 7)
        .replace("{n}", [3, 5, 7][(semente + n) % 3])
        .replace("{area}", area.toLowerCase())
        .replace("{cidade}", cidade);
      const title = bruto[0].toUpperCase() + bruto.slice(1);

      const base = { title, area, format, funnel, city: cidade, briefing,
        date: proximaData(), time: store.config.horarioPadrao,
        tags: [area, TAGS_FUNIL[funnel], format] };

      return { ...base, script: buildScript(base, store.perfil) };
    });

    render();
  }

  function render() {
    if (!ideias.length) { elIdeas.innerHTML = ""; return; }

    elIdeas.innerHTML = `
      <h2 class="section-title" style="font-size:20px;margin:8px 0 0">3 ideias prontas</h2>
      <p class="hint" style="margin:0 0 4px">Aprovar já joga o conteúdo no calendário e no Kanban.</p>
      ${ideias.map((ideia, n) => `
        <article class="idea" data-idea="${n}">
          <div class="idea-head">
            <span class="icon-tile is-gold"><svg><use href="#i-sparkle" /></svg></span>
            <h3>${ideia.title}</h3>
          </div>
          <p><b>Gancho:</b> ${ideia.script.gancho}</p>
          <p><b>CTA:</b> ${ideia.script.cta}</p>
          <p><b>Objetivo:</b> ${ideia.script.objetivo}</p>
          <div class="kan-tags" style="margin-top:14px">${ideia.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
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

    // "Agendar ao aprovar" decide se o card nasce Agendado ou só Aprovado.
    const statusAoAprovar = store.config.agendarAoAprovar ? "agendado" : "aprovado";
    const item = store.criar({ ...ideia, status: acao === "aprovar" ? statusAoAprovar : "rascunho" });

    if (acao === "aprovar") {
      ui.toast(store.config.agendarAoAprovar
        ? `Agendado para ${formatFull(item.date)}.`
        : `Aprovado. Defina a data no calendário quando quiser.`);
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

    if (!store.consumirGeracao()) {
      ui.toast("Você usou todas as gerações do plano. Faça upgrade para continuar.", "erro");
      return;
    }

    gerar();
    elIdeas.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  root.querySelector("[data-limpar]")?.addEventListener("click", () => {
    form.reset();
    form.cidade.value = store.perfil.cidade;
    ideias = [];
    render();
  });

  store.subscribe(renderQuota);
  renderQuota();

  if (dataAlvo) ui.toast(`Novo conteúdo para ${formatFull(dataAlvo)}.`);
}

if (!SPA) initCentral();
