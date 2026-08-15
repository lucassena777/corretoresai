// Calendário editorial + Kanban, com arrastar-e-soltar e persistência local.

(function board() {
  let items = loadItems();
  let cursor = new Date(HOJE.getFullYear(), HOJE.getMonth(), 1);
  let dragId = null;

  const calendar = document.querySelector("[data-calendar]");
  const kanban = document.querySelector("[data-kanban]");
  const monthLabel = document.querySelector("[data-month-label]");

  const iso = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  // "Lançamentos" -> "lancamentos": NFD separa o acento e o filtro só mantém a–z.
  const slug = (text) => text.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");

  function commit() {
    saveItems(items);
    renderCalendar();
    renderKanban();
  }

  // ---- Calendário --------------------------------------------------------

  function renderCalendar() {
    monthLabel.textContent = `${MESES[cursor.getMonth()]} de ${cursor.getFullYear()}`;

    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());

    const weeks = [];
    const day = new Date(start);

    while (true) {
      const week = [];
      for (let n = 0; n < 7; n++) {
        week.push(new Date(day));
        day.setDate(day.getDate() + 1);
      }
      weeks.push(week);
      if (day.getMonth() !== cursor.getMonth() && day > first) break;
      if (weeks.length >= 6) break;
    }

    calendar.innerHTML = weeks.map((week) => `
      <div class="calendar-week">${week.map((date) => {
        const key = iso(date);
        const classes = ["cal-day"];
        if (date.getMonth() !== cursor.getMonth()) classes.push("is-out");
        if (date.getTime() === HOJE.getTime()) classes.push("is-today");

        const cards = boardItems(items)
          .filter((item) => item.date === key)
          .sort((a, b) => a.time.localeCompare(b.time))
          .map((item) => `
            <article class="cal-card" draggable="true" data-id="${item.id}">
              <p class="cal-card-title">
                <i class="status-dot" style="color:${STATUSES[item.status].color}"></i>
                ${item.title}
              </p>
              <p class="cal-card-meta">${item.time} · Marina</p>
              <div class="cal-card-tags">${item.tags.slice(0, 2).map((t) => `<span class="tag">${t}</span>`).join("")}</div>
            </article>`).join("");

        return `<div class="${classes.join(" ")}" data-drop-date="${key}">
          <span class="cal-daynum">${date.getDate()}</span>
          ${cards}
        </div>`;
      }).join("")}</div>`).join("");
  }

  // ---- Kanban ------------------------------------------------------------

  function renderKanban() {
    kanban.innerHTML = Object.entries(STATUSES).map(([key, status]) => {
      const cards = boardItems(items)
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
            ${cards.map((item) => `
              <article class="kan-card" draggable="true" data-id="${item.id}">
                <div class="kan-cover t-${slug(item.area)}">
                  <span class="kan-format">${item.format}</span>
                  <span class="kan-area">${item.area}</span>
                </div>
                <div class="kan-body">
                  <h4>${item.title}</h4>
                  <p class="kan-when">${formatDay(item.date)} · ${item.time}</p>
                  <div class="kan-tags">${item.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
                  <div class="kan-foot">
                    <span class="avatar">MD</span>
                    Marina Duarte
                    <span class="badge s-${key}"><i class="status-dot"></i>${status.label}</span>
                  </div>
                </div>
              </article>`).join("")}
          </div>
        </div>`;
    }).join("");
  }

  // ---- Arrastar-e-soltar -------------------------------------------------

  document.addEventListener("dragstart", (event) => {
    const card = event.target.closest("[data-id]");
    if (!card) return;
    dragId = card.dataset.id;
    card.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", dragId);
  });

  document.addEventListener("dragend", (event) => {
    event.target.closest("[data-id]")?.classList.remove("is-dragging");
    document.querySelectorAll(".is-over").forEach((el) => el.classList.remove("is-over"));
    dragId = null;
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
    const item = items.find((i) => i.id === id);
    if (!item) return;

    if (zone.dataset.dropDate) item.date = zone.dataset.dropDate;
    if (zone.dataset.dropStatus) item.status = zone.dataset.dropStatus;

    commit();
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
  }

  switcher.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (btn) showView(btn.dataset.view);
  });

  renderCalendar();
  renderKanban();
  if (location.hash === "#kanban") showView("kanban");
})();
