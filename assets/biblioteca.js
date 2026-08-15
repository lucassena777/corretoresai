// Biblioteca: busca, filtros, ações em massa e o histórico completo.

(function biblioteca() {
  const grid = document.querySelector("[data-library]");
  const count = document.querySelector("[data-count]");
  const search = document.querySelector("[data-search]");
  const areaSelect = document.querySelector('[data-filter="area"]');
  const ordem = document.querySelector("[data-order]");
  const elActivity = document.querySelector("[data-activity]");

  const filtros = { text: "", area: "", format: "", status: "" };

  areaSelect.innerHTML = `<option value="">Todas</option>` +
    AREAS.map((a) => `<option value="${a}">${a}</option>`).join("");

  function filtrados() {
    const lista = store.itens.filter((item) => {
      if (filtros.area && item.area !== filtros.area) return false;
      if (filtros.format && item.format !== filtros.format) return false;
      if (filtros.status && item.status !== filtros.status) return false;
      if (filtros.text) {
        const alvo = `${item.title} ${item.area} ${item.tags.join(" ")}`.toLowerCase();
        if (!alvo.includes(filtros.text)) return false;
      }
      return true;
    });

    if (ordem.value === "antigos") lista.sort((a, b) => a.date.localeCompare(b.date));
    else if (ordem.value === "titulo") lista.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    else lista.sort((a, b) => b.date.localeCompare(a.date));

    return lista;
  }

  function render() {
    const lista = filtrados();

    count.textContent = lista.length === 1
      ? "1 conteúdo encontrado"
      : `${lista.length} conteúdos encontrados`;

    grid.innerHTML = lista.length
      ? lista.map((item) => ui.itemCard(item)).join("")
      : `<div class="empty" style="grid-column:1/-1">
           <span class="icon-tile"><svg><use href="#i-book" /></svg></span>
           <strong>Nada por aqui</strong>
           <p>Ajuste a busca ou limpe os filtros.</p>
           <button class="btn btn-outline" type="button" data-limpar>Limpar filtros</button>
         </div>`;

    elActivity.innerHTML = store.state.atividades.map((a) => `
      <li>
        <span class="icon-tile"><svg><use href="#${a.icon}" /></svg></span>
        <div>
          <p>${a.text}</p>
          <time>${relativeTime(a.at)}</time>
        </div>
      </li>`).join("") || '<li><p class="hint">Sem movimentações ainda.</p></li>';
  }

  function limpar() {
    filtros.text = filtros.area = filtros.format = filtros.status = "";
    search.value = "";
    areaSelect.value = "";
    document.querySelectorAll("[data-filter-row]").forEach((row) => {
      row.querySelectorAll("button").forEach((b, n) => b.setAttribute("aria-pressed", String(n === 0)));
    });
    render();
  }

  search.addEventListener("input", () => {
    filtros.text = search.value.trim().toLowerCase();
    render();
  });

  areaSelect.addEventListener("change", () => {
    filtros.area = areaSelect.value;
    render();
  });

  ordem.addEventListener("change", render);

  document.querySelectorAll("[data-filter-row]").forEach((row) => {
    row.addEventListener("click", (event) => {
      const btn = event.target.closest("button");
      if (!btn) return;
      row.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      filtros[row.dataset.filterRow] = btn.dataset.value;
      render();
    });
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-limpar]")) { limpar(); return; }
    const card = event.target.closest(".kan-card");
    if (card) ui.openItem(card.dataset.id);
  });

  store.subscribe(render);
  render();
})();
