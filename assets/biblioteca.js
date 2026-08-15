// Biblioteca: busca e filtros sobre todo o acervo, mais o histórico de atividades.

(function biblioteca() {
  const items = loadItems();
  const grid = document.querySelector("[data-library]");
  const count = document.querySelector("[data-count]");
  const search = document.querySelector("[data-search]");
  const areaSelect = document.querySelector('[data-filter="area"]');

  const filters = { text: "", area: "", format: "", status: "" };

  const slug = (text) => text.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");

  [...new Set(items.map((i) => i.area))].sort().forEach((area) => {
    areaSelect.insertAdjacentHTML("beforeend", `<option value="${area}">${area}</option>`);
  });

  const RASCUNHO = { label: "Rascunho", color: "var(--text-dim)" };

  function render() {
    const list = items.filter((item) => {
      if (filters.area && item.area !== filters.area) return false;
      if (filters.format && item.format !== filters.format) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.text) {
        const haystack = `${item.title} ${item.area} ${item.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(filters.text)) return false;
      }
      return true;
    });

    count.textContent = list.length === 1
      ? "1 conteúdo encontrado"
      : `${list.length} conteúdos encontrados`;

    if (!list.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
        <span class="icon-tile"><svg><use href="#i-book" /></svg></span>
        <strong>Nada por aqui</strong>
        <p>Ajuste a busca ou limpe os filtros.</p>
      </div>`;
      return;
    }

    grid.innerHTML = list.map((item) => {
      const status = STATUSES[item.status] ?? RASCUNHO;
      return `
        <article class="kan-card" style="cursor:default">
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
              <span class="badge s-${item.status}" style="color:${status.color}">
                <i class="status-dot"></i>${status.label}
              </span>
            </div>
          </div>
        </article>`;
    }).join("");
  }

  search.addEventListener("input", () => {
    filters.text = search.value.trim().toLowerCase();
    render();
  });

  areaSelect.addEventListener("change", () => {
    filters.area = areaSelect.value;
    render();
  });

  document.querySelectorAll("[data-filter-row]").forEach((row) => {
    row.addEventListener("click", (event) => {
      const btn = event.target.closest("button");
      if (!btn) return;
      row.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      filters[row.dataset.filterRow] = btn.dataset.value;
      render();
    });
  });

  document.querySelector("[data-activity]").innerHTML = ATIVIDADES.map((a) => `
    <li>
      <span class="icon-tile"><svg><use href="#${a.icon}" /></svg></span>
      <div>
        <p>${a.text}</p>
        <time>${a.when}</time>
      </div>
    </li>`).join("");

  render();
})();
