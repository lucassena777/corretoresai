// Perfil: os dados que assinam o conteúdo e alimentam o gerador.

function initPerfil(root = document) {
  if (!auth.exigirLogin()) return;

  const form = root.querySelector("[data-perfil]");
  const elAreas = root.querySelector("[data-areas]");

  function carregar() {
    const p = store.perfil;

    ["nome", "creci", "email", "telefone", "cidade", "imobiliaria", "bio", "instagram", "tom"]
      .forEach((campo) => { if (form[campo]) form[campo].value = p[campo] ?? ""; });

    form.email.value = db.contaAtual()?.email ?? "";

    elAreas.innerHTML = AREAS.map((area) => `
      <button type="button" data-area="${area}" aria-pressed="${p.areas.includes(area)}">${area}</button>
    `).join("");

    root.querySelector("[data-avatar]").textContent = ui.initials(p.nome);
    root.querySelector("[data-nome]").textContent = p.nome || "Sem nome";
    root.querySelector("[data-creci]").textContent = p.creci || db.contaAtual()?.email || "";
    root.querySelector("[data-total]").textContent = store.itens.length;
    root.querySelector("[data-plano]").textContent = store.plano.label;
  }

  elAreas.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-area]");
    if (!btn) return;
    btn.setAttribute("aria-pressed", String(btn.getAttribute("aria-pressed") !== "true"));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const areas = [...elAreas.querySelectorAll('[aria-pressed="true"]')].map((b) => b.dataset.area);

    store.salvarPerfil({
      nome: form.nome.value.trim() || "Sem nome",
      creci: form.creci.value.trim(),
      telefone: form.telefone.value.trim(),
      cidade: form.cidade.value.trim() || PERFIL_PADRAO.cidade,
      imobiliaria: form.imobiliaria.value.trim(),
      bio: form.bio.value.trim(),
      instagram: form.instagram.value.trim(),
      tom: form.tom.value.trim(),
      areas: areas.length ? areas : [AREAS[0]]
    });

    ui.toast("Perfil salvo.");
  });

  store.subscribe(carregar);
  carregar();
}

if (!SPA) initPerfil();
