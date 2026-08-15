// Dashboard: tudo lido do store e redesenhado a cada mudança.

function initDashboard(root = document) {
  const elStats = root.querySelector("[data-stats]");
  const elUpcoming = root.querySelector("[data-upcoming]");
  const elActivity = root.querySelector("[data-activity]");
  const elMonthLabel = root.querySelector("[data-month-label]");
  const elMiniMonth = root.querySelector("[data-mini-month]");

  let cursor = new Date(HOJE.getFullYear(), HOJE.getMonth(), 1);

  function startOfWeek(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function render() {
    const itens = store.itens;
    const board = store.board();
    const publicados = board.filter((i) => i.status === "publicado");
    const agendados = board.filter((i) => i.status === "agendado");
    const doMes = board.filter((i) => {
      const [y, m] = i.date.split("-").map(Number);
      return y === cursor.getFullYear() && m === cursor.getMonth() + 1;
    });

    // Estimativas: proporcionais ao que já foi publicado, para reagirem às edições.
    const views = publicados.length * 3100;
    const leads = Math.round(publicados.length * 29.5);

    const stats = [
      { icon: "i-copy", value: itens.length, label: "Conteúdos criados", note: "Total na sua conta" },
      { icon: "i-send", value: publicados.length, label: "Conteúdos publicados", note: "Já estão no ar" },
      { icon: "i-calendar-clock", value: agendados.length, label: "Conteúdos agendados", note: "Com data confirmada" },
      { icon: "i-eye", value: `${(views / 1000).toFixed(1).replace(".", ",")} mil`, label: "Visualizações estimadas", note: "Projeção do que já foi publicado" },
      { icon: "i-user-plus", value: leads, label: "Leads gerados", note: "Estimativa por conversão de funil" },
      { icon: "i-calendar", value: doMes.length, label: "Posts do mês", note: `Programados para ${MESES[cursor.getMonth()].toLowerCase()}` }
    ];

    elStats.innerHTML = stats.map((s) => `
      <article class="stat-card">
        <span class="icon-tile"><svg><use href="#${s.icon}" /></svg></span>
        <b>${s.value}</b>
        <em>${s.label}</em>
        <span>${s.note}</span>
      </article>`).join("");

    // ---- Próximos conteúdos ---------------------------------------------

    const hojeIso = toIso(HOJE);
    const proximos = board
      .filter((i) => i.status !== "publicado" && i.date >= hojeIso)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 6);

    if (!proximos.length) {
      elUpcoming.innerHTML = `
        <div class="empty">
          <span class="icon-tile"><svg><use href="#i-calendar" /></svg></span>
          <strong>Nada agendado por enquanto</strong>
          <p>Gere um conteúdo e aprove: ele entra no calendário na hora.</p>
          <a class="btn btn-primary" href="central.html"><svg><use href="#i-plus" /></svg>Criar conteúdo</a>
        </div>`;
    } else {
      elUpcoming.innerHTML = `<ul class="activity is-clickable">${proximos.map((i) => `
        <li data-id="${i.id}">
          <span class="icon-tile"><svg><use href="#i-${i.status === "agendado" ? "calendar-clock" : "check-circle"}" /></svg></span>
          <div>
            <p>${i.title}</p>
            <time>${formatDay(i.date)} · ${i.time} · ${i.format} · ${STATUSES[i.status].label}</time>
          </div>
        </li>`).join("")}</ul>`;
    }

    // ---- Calendário resumido --------------------------------------------

    elMonthLabel.textContent = `${MESES[cursor.getMonth()]} de ${cursor.getFullYear()}`;

    const comPost = new Set(board.map((i) => i.date));
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    const weekStart = startOfWeek(HOJE);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    let html = ["D", "S", "T", "Q", "Q", "S", "S"].map((d) => `<span class="wd">${d}</span>`).join("");

    for (let n = 0; n < 42; n++) {
      const day = new Date(start);
      day.setDate(start.getDate() + n);
      if (n >= 35 && day.getMonth() !== cursor.getMonth()) break;

      const classes = ["d"];
      if (day.getMonth() !== cursor.getMonth()) classes.push("is-out");
      if (comPost.has(toIso(day))) classes.push("has-post");
      if (day >= weekStart && day <= weekEnd) classes.push("is-week");
      if (day.getTime() === HOJE.getTime()) classes.push("is-today");

      html += `<span class="${classes.join(" ")}">${day.getDate()}</span>`;
    }

    elMiniMonth.innerHTML = html;

    // ---- Atividades ------------------------------------------------------

    elActivity.innerHTML = store.state.atividades.slice(0, 12).map((a) => `
      <li>
        <span class="icon-tile"><svg><use href="#${a.icon}" /></svg></span>
        <div>
          <p>${a.text}</p>
          <time>${relativeTime(a.at)}</time>
        </div>
      </li>`).join("");
  }

  root.querySelectorAll("[data-month]").forEach((btn) => {
    btn.addEventListener("click", () => {
      cursor.setMonth(cursor.getMonth() + Number(btn.dataset.month));
      render();
    });
  });

  elUpcoming.addEventListener("click", (event) => {
    const row = event.target.closest("[data-id]");
    if (row) ui.openItem(row.dataset.id);
  });

  store.subscribe(render);
  render();
}

if (!SPA) initDashboard();
