// Perfil e configurações — grava no store, e o resto do app reage na hora.

function initPerfil(root = document) {
  const form = root.querySelector("[data-perfil]");
  const elAreas = root.querySelector("[data-areas]");
  const elPlanos = root.querySelector("[data-planos]");
  const elNota = root.querySelector("[data-plano-nota]");

  function preencher() {
    const p = store.perfil;
    form.nome.value = p.nome;
    form.creci.value = p.creci;
    form.cidade.value = p.cidade;
    form.instagram.value = p.instagram;
    form.tom.value = p.tom;

    elAreas.innerHTML = AREAS.map((area) => `
      <button type="button" data-area="${area}" aria-pressed="${p.areas.includes(area)}">${area}</button>
    `).join("");
  }

  function renderPlanos() {
    elPlanos.innerHTML = Object.entries(PLANOS).map(([id, plano]) => `
      <button type="button" data-plano="${id}" aria-pressed="${id === store.planoId}">
        ${plano.label} · ${plano.preco}
      </button>`).join("");

    const restantes = store.restantes();
    elNota.innerHTML = restantes === Infinity
      ? "Gerações ilimitadas liberadas."
      : `${restantes} de ${store.plano.cota} gerações restantes neste ciclo.`;
  }

  elAreas.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-area]");
    if (!btn) return;
    btn.setAttribute("aria-pressed", String(btn.getAttribute("aria-pressed") !== "true"));
  });

  elPlanos.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-plano]");
    if (!btn) return;
    store.trocarPlano(btn.dataset.plano);
    ui.toast(`Plano alterado para ${PLANOS[btn.dataset.plano].label}.`);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const areas = [...elAreas.querySelectorAll('[aria-pressed="true"]')].map((b) => b.dataset.area);

    store.salvarPerfil({
      nome: form.nome.value.trim() || PERFIL_PADRAO.nome,
      creci: form.creci.value.trim(),
      cidade: form.cidade.value.trim() || PERFIL_PADRAO.cidade,
      instagram: form.instagram.value.trim(),
      tom: form.tom.value.trim(),
      areas: areas.length ? areas : [AREAS[0]]
    });

    ui.toast("Perfil salvo.");
  });

  root.querySelector("[data-reset]").addEventListener("click", () => {
    if (!confirm("Restaurar o acervo original? Tudo o que você criou e editou será perdido.")) return;
    store.reset();
    preencher();
    ui.toast("Acervo restaurado.");
  });

  // Cópia em vez de download: funciona tanto no arquivo local quanto na prévia publicada.
  root.querySelector("[data-exportar]").addEventListener("click", () => {
    navigator.clipboard?.writeText(JSON.stringify(store.state, null, 2))
      .then(() => ui.toast("Dados copiados como JSON."))
      .catch(() => ui.toast("Não foi possível copiar.", "erro"));
  });

  store.subscribe(renderPlanos);
  preencher();
  renderPlanos();
}

if (!SPA) initPerfil();
