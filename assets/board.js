// Calendário editorial + Kanban: arrastar-e-soltar, clique para editar, tudo no store.

(function board() {
  let cursor = new Date(HOJE.getFullYear(), HOJE.getMonth(), 1);
  let dragId = null;
  let arrastou = false;

  const elCalendar = document.querySelector("[data-calendar]");
  const elKanban = document.querySelector("[data-kanban]");
  const elMonthLabel = document.querySelector("[data-month-label]");

  function renderCalendar() {
    elMonthLabel.textContent = `${MESES[cursor.getMonth()]} de ${cursor.getFullYear()}`;

    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());

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

        return `<div class="${classes.join(" ")}" data-drop-date="${key}">
          <button class="cal-daynum" type="button" data-new-on="${key}" title="Criar conteúdo neste dia">${date.getDate()}</button>
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
            ${cards.map((item) => ui.itemCard(item, { draggable: true })).join("")
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

  document.addEventListener("dragstart", (event) => {
    const card = event.target.closest("[data-id]");
    if (!card) return;
    dragId = card.dataset.id;
    arrastou = true;
    card.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", dragId);
  });

  document.addEventListener("dragend", (event) => {
    event.target.closest("[data-id]")?.classList.remove("is-dragging");
    document.querySelectorAll(".is-over").forEach((el) => el.classList.remove("is-over"));
    dragId = null;
    setTimeout(() => { arrastou = false; }, 0);
  });

  document.addEventListener("dragover", (event) => {
    const zone = event.target.closest("[data-drop-date], [data-drop-status]");
    if (!zone) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (!zone.classList.contains("is-over")) {
      document.querySelectorAll(".is-over").forEach((el) => el.classList.remove("is-over"));
      zone.classList.add("is-over");
    }
  });

  document.addEventListener("drop", (event) => {
    const zone = event.target.closest("[data-drop-date], [data-drop-status]");
    if (!zone) return;
    event.preventDefault();

    const id = dragId || event.dataTransfer.getData("text/plain");
    if (!id) return;

    if (zone.dataset.dropDate) {
      store.mover(id, { date: zone.dataset.dropDate });
      ui.toast(`Reagendado para ${formatFull(zone.dataset.dropDate)}.`);
    }
    if (zone.dataset.dropStatus) {
      store.mover(id, { status: zone.dataset.dropStatus });
      ui.toast(`Movido para ${STATUSES[zone.dataset.dropStatus].label}.`);
    }
  });

  // ---- Cliques -----------------------------------------------------------

  document.addEventListener("click", (event) => {
    const novo = event.target.closest("[data-new-on]");
    if (novo) {
      location.href = `central.html?data=${novo.dataset.newOn}`;
      return;
    }

    const card = event.target.closest(".cal-card, .kan-card");
    if (card && !arrastou) ui.openItem(card.dataset.id);
  });

  // ---- Controles ---------------------------------------------------------

  document.querySelectorAll("[data-month]").forEach((btn) => {
    btn.addEventListener("click", () => {
      cursor.setMonth(cursor.getMonth() + Number(btn.dataset.month));
      renderCalendar();
    });
  });

  document.querySelector("[data-today]").addEventListener("click", () => {
    cursor = new Date(HOJE.getFullYear(), HOJE.getMonth(), 1);
    renderCalendar();
  });

  const switcher = document.querySelector("[data-view-switch]");
  const panels = {
    calendario: document.querySelector('[data-panel="calendario"]'),
    kanban: document.querySelector('[data-panel="kanban"]')
  };

  function showView(name) {
    switcher.querySelectorAll("button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.view === name)));
    panels.calendario.classList.toggle("is-hidden", name !== "calendario");
    panels.kanban.classList.toggle("is-hidden", name !== "kanban");
    history.replaceState(null, "", name === "kanban" ? "#kanban" : " ");
  }

  switcher.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (btn) showView(btn.dataset.view);
  });

  store.subscribe(render);
  render();
  if (location.hash === "#kanban") showView("kanban");
})();
