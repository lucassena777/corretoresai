// Biblioteca: busca em todo o conteúdo do roteiro, filtros combinados e exportação.

function initBiblioteca(root = document) {
  if (!auth.exigirLogin()) return;

  const grid = root.querySelector("[data-library]");
  const count = root.querySelector("[data-count]");
  const search = root.querySelector("[data-search]");

  const filtros = { texto: "", area: "", periodo: "", format: "", funnel: "", status: "" };

  const opcoes = (lista, rotulo) =>
    `<option value="">${rotulo}</option>` +
    lista.map(([v, t]) => `<option value="${v}">${t}</option>`).join("");

  root.querySelector('[data-filtro="area"]').innerHTML =
    opcoes(AREAS.map((a) => [a, a]), "Todas as categorias");
  root.querySelector('[data-filtro="format"]').innerHTML =
    opcoes(FORMATOS.map((f) => [f, f]), "Todos os formatos");
  root.querySelector('[data-filtro="funnel"]').innerHTML =
    opcoes(FUNIS.map((f) => [f, f]), "Todos os funis");
  root.querySelector('[data-filtro="status"]').innerHTML =
    opcoes(Object.entries(STATUSES).map(([k, s]) => [k, s.label]), "Todos os status");

  function dentroDoPeriodo(item) {
    if (!filtros.periodo) return true;
    const hoje = HOJE.getTime();
    const data = new Date(`${item.date}T00:00:00`).getTime();
    const dias = (hoje - data) / 86400000;

    if (filtros.periodo === "7") return dias >= 0 && dias <= 7;
    if (filtros.periodo === "30") return dias >= 0 && dias <= 30;
    if (filtros.periodo === "futuro") return dias < 0;
    if (filtros.periodo === "mes") {
      const [y, m] = item.date.split("-").map(Number);
      return y === HOJE.getFullYear() && m === HOJE.getMonth() + 1;
    }
    return true;
  }

  function filtrados() {
    return store.itens.filter((item) => {
      if (filtros.area && item.area !== filtros.area) return false;
      if (filtros.format && item.format !== filtros.format) return false;
      if (filtros.funnel && item.funnel !== filtros.funnel) return false;
      if (filtros.status && item.status !== filtros.status) return false;
      if (!dentroDoPeriodo(item)) return false;

      if (filtros.texto) {
        const r = store.roteiro(item);
        const alvo = [item.title, item.area, item.format, item.tags.join(" "),
          r.gancho, r.legenda, r.hashtags, r.cta].join(" ").toLowerCase();
        if (!alvo.includes(filtros.texto)) return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  function render() {
    const lista = filtrados();
    const total = store.itens.length;

    count.textContent = lista.length === total
      ? `${total} ${total === 1 ? "conteúdo" : "conteúdos"} no acervo`
      : `${lista.length} de ${total} conteúdos`;

    if (!store.itens.length) {
      grid.innerHTML = `
        <div class="empty" style="grid-column:1/-1">
          <span class="icon-tile"><svg><use href="#i-book" /></svg></span>
          <strong>Sua biblioteca está vazia</strong>
          <p>Gere o primeiro conteúdo e ele aparece aqui, com roteiro completo.</p>
          <a class="btn btn-primary" href="central.html"><svg><use href="#i-plus" /></svg>Criar conteúdo</a>
        </div>`;
      return;
    }

    grid.innerHTML = lista.length
      ? lista.map((item) => ui.itemCard(item, { resumo: true, data: true })).join("")
      : `<div class="empty" style="grid-column:1/-1">
           <span class="icon-tile"><svg><use href="#i-search" /></svg></span>
           <strong>Nada bate com esses filtros</strong>
           <p>Tente outra busca ou volte para o acervo completo.</p>
           <button class="btn btn-outline" type="button" data-limpar>Limpar filtros</button>
         </div>`;
  }

  function limpar() {
    Object.keys(filtros).forEach((k) => { filtros[k] = ""; });
    search.value = "";
    root.querySelectorAll("[data-filtro]").forEach((s) => { s.value = ""; });
    render();
  }

  search.addEventListener("input", () => {
    filtros.texto = search.value.trim().toLowerCase();
    render();
  });

  root.querySelectorAll("[data-filtro]").forEach((select) => {
    select.addEventListener("change", () => {
      filtros[select.dataset.filtro] = select.value;
      render();
    });
  });

  root.addEventListener("click", (event) => {
    if (event.target.closest("[data-limpar]")) { limpar(); return; }

    if (event.target.closest("[data-exportar]")) {
      const lista = filtrados();
      if (!lista.length) return ui.toast("Não há nada para exportar com esses filtros.", "erro");
      ui.exportarTexto(lista);
      return;
    }

    const card = event.target.closest(".content-card");
    if (card) ui.openItem(card.dataset.id);
  });

  store.subscribe(render);
  render();
}

if (!SPA) initBiblioteca();
