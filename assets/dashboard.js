// Dashboard: métricas, próximos conteúdos, calendário resumido e atividades.

(function dashboard() {
  const items = loadItems();
  const board = boardItems(items);

  const publicados = board.filter((i) => i.status === "publicado");
  const agendados = board.filter((i) => i.status === "agendado");
  const doMes = board.filter((i) => {
    const [y, m] = i.date.split("-").map(Number);
    return y === HOJE.getFullYear() && m === HOJE.getMonth() + 1;
  });

  const stats = [
    { icon: "i-copy", value: items.length, label: "Conteúdos criados", note: "Total na sua conta" },
    { icon: "i-send", value: publicados.length, label: "Conteúdos publicados", note: "Já estão no ar" },
    { icon: "i-calendar-clock", value: agendados.length, label: "Conteúdos agendados", note: "Com data confirmada" },
    { icon: "i-eye", value: "18,6 mil", label: "Visualizações estimadas", note: "Projeção do que já foi publicado" },
    { icon: "i-user-plus", value: 177, label: "Leads gerados", note: "Estimativa por conversão de funil" },
    { icon: "i-calendar", value: doMes.length, label: "Posts do mês", note: "Programados para este mês" }
  ];

  document.querySelector("[data-stats]").innerHTML = stats.map((s) => `
    <article class="stat-card">
      <span class="icon-tile"><svg><use href="#${s.icon}" /></svg></span>
      <b>${s.value}</b>
      <em>${s.label}</em>
      <span>${s.note}</span>
    </article>`).join("");

  // ---- Próximos conteúdos ----------------------------------------------

  const hojeIso = HOJE.toISOString().slice(0, 10);
  const proximos = board
    .filter((i) => i.status !== "publicado" && i.date >= hojeIso)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 5);

  const upcoming = document.querySelector("[data-upcoming]");

  if (!proximos.length) {
    upcoming.innerHTML = `
      <div class="empty">
        <span class="icon-tile"><svg><use href="#i-calendar" /></svg></span>
        <strong>Nada agendado por enquanto</strong>
        <p>Gere um conteúdo e aprove: ele entra no calendário na hora.</p>
        <a class="btn btn-primary" href="central.html"><svg><use href="#i-plus" /></svg>Criar conteúdo</a>
      </div>`;
  } else {
    upcoming.innerHTML = `<ul class="activity">${proximos.map((i) => `
      <li>
        <span class="icon-tile"><svg><use href="#i-${i.status === "agendado" ? "calendar-clock" : "check-circle"}" /></svg></span>
        <div>
          <p>${i.title}</p>
          <time>${formatDay(i.date)} · ${i.time} · ${i.format} · ${STATUSES[i.status].label}</time>
        </div>
      </li>`).join("")}</ul>`;
  }

  // ---- Calendário resumido ---------------------------------------------

  const label = document.querySelector("[data-month-label]");
  const grid = document.querySelector("[data-mini-month]");
  let cursor = new Date(HOJE.getFullYear(), HOJE.getMonth(), 1);

  const comPost = new Set(board.map((i) => i.date));

  function startOfWeek(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function renderMonth() {
    label.textContent = `${MESES[cursor.getMonth()]} de ${cursor.getFullYear()}`;

    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    const weekStart = startOfWeek(HOJE);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    let html = ["D", "S", "T", "Q", "Q", "S", "S"]
      .map((d) => `<span class="wd">${d}</span>`).join("");

    for (let n = 0; n < 42; n++) {
      const day = new Date(start);
      day.setDate(start.getDate() + n);
      if (n >= 35 && day.getMonth() !== cursor.getMonth()) break;

      const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      const classes = ["d"];
      if (day.getMonth() !== cursor.getMonth()) classes.push("is-out");
      if (comPost.has(iso)) classes.push("has-post");
      if (day >= weekStart && day <= weekEnd) classes.push("is-week");
      if (day.getTime() === HOJE.getTime()) classes.push("is-today");

      html += `<span class="${classes.join(" ")}">${day.getDate()}</span>`;
    }

    grid.innerHTML = html;
  }

  document.querySelectorAll("[data-month]").forEach((btn) => {
    btn.addEventListener("click", () => {
      cursor.setMonth(cursor.getMonth() + Number(btn.dataset.month));
      renderMonth();
    });
  });

  renderMonth();

  // ---- Atividades recentes ---------------------------------------------

  document.querySelector("[data-activity]").innerHTML = ATIVIDADES.map((a) => `
    <li>
      <span class="icon-tile"><svg><use href="#${a.icon}" /></svg></span>
      <div>
        <p>${a.text}</p>
        <time>${a.when}</time>
      </div>
    </li>`).join("");
})();
