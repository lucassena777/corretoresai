// Calendário editorial + Kanban: arrastar-e-soltar, clique para editar, tudo no store.

function initBoard(root = document, opts = {}) {
  if (!auth.exigirLogin()) return;

  let cursor = new Date(HOJE.getFullYear(), HOJE.getMonth(), 1);
  let dragId = null;
  let arrastou = false;
  let arrastandoCompromisso = false;

  const elCalendar = root.querySelector("[data-calendar]");
  const elKanban = root.querySelector("[data-kanban]");
  const elMonthLabel = root.querySelector("[data-month-label]");

  // Título e local do compromisso são digitados à mão: escapar antes de virar
  // HTML, senão um "<" do corretor quebra a célula do dia.
  const esc = (v) => String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");


  function renderCalendar() {
    elMonthLabel.textContent = `${MESES[cursor.getMonth()]} de ${cursor.getFullYear()}`;

    const inicioSemana = store.config.semanaComeca;
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() - inicioSemana + 7) % 7));

    const nomes = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
    root.querySelector(".calendar-head").innerHTML =
      [...nomes.slice(inicioSemana), ...nomes.slice(0, inicioSemana)]
        .map((n) => `<span>${n}</span>`).join("");

    const weeks = [];
    const day = new Date(start);

    while (weeks.length < 6) {
      const week = [];
      for (let n = 0; n < 7; n++) {
        week.push(new Date(day));
        day.setDate(day.getDate() + 1);
      }
      weeks.push(week);
      if (day.getMonth() !== cursor.getMonth() && day > first) break;
    }

    const itens = store.board();
    const compromissos = store.compromissos;

    elCalendar.innerHTML = weeks.map((week) => `
      <div class="calendar-week">${week.map((date) => {
        const key = toIso(date);
        const classes = ["cal-day"];
        if (date.getMonth() !== cursor.getMonth()) classes.push("is-out");
        if (date.getTime() === HOJE.getTime()) classes.push("is-today");

        const cards = itens
          .filter((item) => item.date === key)
          .sort((a, b) => a.time.localeCompare(b.time))
          .map((item) => `
            <article class="cal-card" draggable="true" data-id="${item.id}">
              <p class="cal-card-title">
                <i class="status-dot" style="color:${STATUSES[item.status].color}"></i>
                ${item.title}
              </p>
              <p class="cal-card-meta">${item.time} · ${store.perfil.nome.split(" ")[0]}</p>
              <div class="cal-card-tags">${item.tags.slice(0, 2).map((t) => `<span class="tag">${t}</span>`).join("")}</div>
            </article>`).join("");

        // Compromisso vem antes do conteúdo no dia: ele tem hora marcada com
        // outra pessoa, o post não.
        const agenda = compromissos
          .filter((c) => c.date === key)
          .sort((a, b) => a.time.localeCompare(b.time))
          .map((c) => {
            const t = TIPOS_COMPROMISSO[c.tipo] || TIPOS_COMPROMISSO[COMPROMISSO_PADRAO];
            return `
            <article class="cal-compromisso" draggable="true" data-compromisso="${c.id}"
                     style="--cor-tipo:${t.color}" title="${t.label} · ${c.time}">
              <p class="cal-compromisso-titulo">
                <svg><use href="#${t.icon}" /></svg>${esc(c.title)}
              </p>
              <p class="cal-compromisso-meta">${c.time}${c.local ? ` · ${esc(c.local)}` : ""}</p>
            </article>`;
          }).join("");

        return `<div class="${classes.join(" ")}" data-drop-date="${key}">
          <div class="cal-day-topo">
            <button class="cal-daynum" type="button" data-new-on="${key}" title="Criar conteúdo neste dia">${date.getDate()}</button>
            <button class="cal-day-mais" type="button" data-novo-compromisso="${key}"
                    title="Marcar compromisso neste dia" aria-label="Marcar compromisso neste dia">
              <svg><use href="#i-plus" /></svg>
            </button>
          </div>
          ${agenda}
          ${cards}
        </div>`;
      }).join("")}</div>`).join("");
  }

  function renderKanban() {
    const itens = store.board();

    elKanban.innerHTML = KANBAN.map((key) => {
      const status = STATUSES[key];
      const cards = itens
        .filter((item) => item.status === key)
        .sort((a, b) => a.date.localeCompare(b.date));

      return `
        <div class="kan-col">
          <div class="kan-head">
            <i class="status-dot" style="color:${status.color}"></i>
            ${status.label}
            <span class="count">${cards.length}</span>
            <span class="hint">${status.hint}</span>
          </div>
          <div class="kan-drop" data-drop-status="${key}">
            ${cards.map((item) => ui.itemCard(item, { draggable: true, data: true })).join("")
              || '<p class="hint" style="padding:18px;text-align:center">Solte um card aqui.</p>'}
          </div>
        </div>`;
    }).join("");
  }

  function render() {
    renderCalendar();
    renderKanban();
  }

  // ---- Arrastar-e-soltar -------------------------------------------------

  root.addEventListener("dragstart", (event) => {
    const card = event.target.closest("[data-id], [data-compromisso]");
    if (!card) return;
    dragId = card.dataset.id || card.dataset.compromisso;
    arrastandoCompromisso = Boolean(card.dataset.compromisso);
    arrastou = true;
    card.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", dragId);
  });

  root.addEventListener("dragend", (event) => {
    event.target.closest("[data-id], [data-compromisso]")?.classList.remove("is-dragging");
    document.querySelectorAll(".is-over").forEach((el) => el.classList.remove("is-over"));
    dragId = null;
    setTimeout(() => { arrastou = false; }, 0);
  });

  root.addEventListener("dragover", (event) => {
    const zone = event.target.closest("[data-drop-date], [data-drop-status]");
    if (!zone) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (!zone.classList.contains("is-over")) {
      document.querySelectorAll(".is-over").forEach((el) => el.classList.remove("is-over"));
      zone.classList.add("is-over");
    }
  });

  root.addEventListener("drop", (event) => {
    const zone = event.target.closest("[data-drop-date], [data-drop-status]");
    if (!zone) return;
    event.preventDefault();

    const id = dragId || event.dataTransfer.getData("text/plain");
    if (!id) return;

    if (zone.dataset.dropDate) {
      if (arrastandoCompromisso) {
        store.atualizarCompromisso(id, { date: zone.dataset.dropDate });
        ui.toast(`Compromisso movido para ${formatFull(zone.dataset.dropDate)}.`);
      } else {
        store.mover(id, { date: zone.dataset.dropDate });
        ui.toast(`Reagendado para ${formatFull(zone.dataset.dropDate)}.`);
      }
    }
    if (zone.dataset.dropStatus) {
      store.mover(id, { status: zone.dataset.dropStatus });
      ui.toast(`Movido para ${STATUSES[zone.dataset.dropStatus].label}.`);
    }
  });

  // ---- Cliques -----------------------------------------------------------

  root.addEventListener("click", (event) => {
    const marcar = event.target.closest("[data-novo-compromisso]");
    if (marcar) {
      ui.openCompromisso(null, marcar.dataset.novoCompromisso);
      return;
    }

    const compromisso = event.target.closest("[data-compromisso]");
    if (compromisso && !arrastou) {
      ui.openCompromisso(compromisso.dataset.compromisso);
      return;
    }

    const novo = event.target.closest("[data-new-on]");
    if (novo) {
      goCentral(novo.dataset.newOn);
      return;
    }

    const card = event.target.closest(".cal-card, .content-card");
    if (card && !arrastou && !event.target.closest("[data-menu]")) ui.openItem(card.dataset.id);
  });

  // ---- Controles ---------------------------------------------------------

  root.querySelectorAll("[data-month]").forEach((btn) => {
    btn.addEventListener("click", () => {
      cursor.setMonth(cursor.getMonth() + Number(btn.dataset.month));
      renderCalendar();
    });
  });

  root.querySelector("[data-novo-compromisso-barra]")?.addEventListener("click", () => {
    // Sem dia escolhido, cai em hoje — é o que o corretor quer marcar na maioria
    // das vezes, e a data continua editável no formulário.
    ui.openCompromisso(null, toIso(HOJE));
  });

  root.querySelector("[data-today]").addEventListener("click", () => {
    cursor = new Date(HOJE.getFullYear(), HOJE.getMonth(), 1);
    renderCalendar();
  });

  const switcher = root.querySelector("[data-view-switch]");
  const panels = {
    calendario: root.querySelector('[data-panel="calendario"]'),
    kanban: root.querySelector('[data-panel="kanban"]')
  };

  function showView(name) {
    switcher.querySelectorAll("button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.view === name)));
    panels.calendario.classList.toggle("is-hidden", name !== "calendario");
    panels.kanban.classList.toggle("is-hidden", name !== "kanban");

    // A aba fica no endereço para o link poder ser compartilhado, mas sem sair
    // da rota do Calendário Editorial.
    if (!SPA) history.replaceState(null, "", name === "kanban" ? "#kanban" : " ");
    else if (location.hash !== "#/kanban") {
      history.replaceState(null, "", name === "kanban" ? "#/calendario?aba=kanban" : "#/calendario");
    }
  }

  switcher.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (btn) showView(btn.dataset.view);
  });

  store.subscribe(render);
  render();

  const inicial = opts.view
    || routeParams().get("aba")
    || (!SPA && location.hash === "#kanban" ? "kanban" : "calendario");
  if (inicial === "kanban") showView("kanban");
}

if (!SPA) initBoard();
