// Peças de interface compartilhadas: avisos, modal e o editor de conteúdo.

const ui = (() => {
  let toastTimer = null;

  function toast(message, kind = "ok") {
    let box = document.querySelector(".toast");
    if (!box) {
      box = document.createElement("div");
      box.className = "toast";
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.dataset.kind = kind;
    box.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove("is-on"), 2600);
  }

  function closeModal() {
    document.querySelector(".modal-backdrop")?.remove();
    document.body.style.overflow = "";
  }

  function openModal(html, onMount) {
    closeModal();
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop || event.target.closest("[data-close]")) closeModal();
    });
    document.addEventListener("keydown", function esc(event) {
      if (event.key === "Escape") { closeModal(); document.removeEventListener("keydown", esc); }
    });

    onMount?.(backdrop.firstElementChild);
    return closeModal;
  }

  // ---- Editor completo de um conteúdo ------------------------------------

  function openItem(id) {
    const item = store.find(id);
    if (!item) return;
    const script = store.roteiro(item);

    const options = (list, atual) => list
      .map((v) => `<option value="${v}"${v === atual ? " selected" : ""}>${v}</option>`)
      .join("");

    const statusOptions = Object.entries(STATUSES)
      .map(([key, s]) => `<option value="${key}"${key === item.status ? " selected" : ""}>${s.label}</option>`)
      .join("");

    openModal(`
      <header class="modal-head">
        <div>
          <span class="chip"><svg><use href="#i-${item.format === "Carrossel" ? "book" : "film"}" /></svg>${item.format}</span>
          <h2 data-live-title>${item.title}</h2>
        </div>
        <button class="theme-btn" type="button" data-close aria-label="Fechar">
          <svg><use href="#i-close" /></svg>
        </button>
      </header>

      <div class="modal-body">
        <div class="field">
          <label for="m-title">Título</label>
          <input id="m-title" name="title" value="${item.title.replace(/"/g, "&quot;")}" />
        </div>

        <div class="field field-row">
          <div>
            <label for="m-date">Data</label>
            <input id="m-date" name="date" type="date" value="${item.date}" />
          </div>
          <div>
            <label for="m-time">Horário</label>
            <input id="m-time" name="time" type="time" value="${item.time}" />
          </div>
        </div>

        <div class="field field-row">
          <div>
            <label for="m-area">Área</label>
            <select id="m-area" name="area">${options(AREAS, item.area)}</select>
          </div>
          <div>
            <label for="m-format">Formato</label>
            <select id="m-format" name="format">${options(FORMATOS, item.format)}</select>
          </div>
        </div>

        <div class="field field-row">
          <div>
            <label for="m-funnel">Etapa do funil</label>
            <select id="m-funnel" name="funnel">${options(FUNIS, item.funnel || "Topo")}</select>
          </div>
          <div>
            <label for="m-status">Status</label>
            <select id="m-status" name="status">${statusOptions}</select>
          </div>
        </div>

        <div class="field">
          <label for="m-tags">Tags <small>(separadas por vírgula)</small></label>
          <input id="m-tags" name="tags" value="${item.tags.join(", ")}" />
        </div>

        <details class="roteiro" open>
          <summary>Roteiro completo — 11 campos</summary>
          ${CAMPOS_ROTEIRO.map(([key, label]) => `
            <div class="field">
              <label for="m-${key}">${label}</label>
              <textarea id="m-${key}" name="script.${key}" rows="${key === "legenda" ? 4 : 2}">${script[key] ?? ""}</textarea>
            </div>`).join("")}
        </details>
      </div>

      <footer class="modal-foot">
        <button class="btn btn-outline" type="button" data-action="regenerar">
          <svg><use href="#i-wand" /></svg>Regerar roteiro
        </button>
        <button class="btn btn-outline" type="button" data-action="copiar">
          <svg><use href="#i-copy" /></svg>Copiar
        </button>
        <button class="btn btn-outline" type="button" data-action="duplicar">Duplicar</button>
        <button class="btn btn-outline is-danger" type="button" data-action="excluir">
          <svg><use href="#i-trash" /></svg>Excluir
        </button>
        <button class="btn btn-primary" type="button" data-action="salvar">Salvar alterações</button>
      </footer>
    `, (modal) => {
      const field = (name) => modal.querySelector(`[name="${name}"]`);

      field("title").addEventListener("input", (event) => {
        modal.querySelector("[data-live-title]").textContent = event.target.value;
      });

      modal.addEventListener("click", (event) => {
        const action = event.target.closest("[data-action]")?.dataset.action;
        if (!action) return;

        if (action === "salvar") {
          const patch = {
            title: field("title").value.trim() || item.title,
            date: field("date").value || item.date,
            time: field("time").value || item.time,
            area: field("area").value,
            format: field("format").value,
            funnel: field("funnel").value,
            status: field("status").value,
            tags: field("tags").value.split(",").map((t) => t.trim()).filter(Boolean),
            script: Object.fromEntries(CAMPOS_ROTEIRO.map(([key]) => [key, field(`script.${key}`).value]))
          };
          store.atualizar(id, patch);
          closeModal();
          toast("Conteúdo salvo.");
        }

        if (action === "regenerar") {
          const base = { ...item, area: field("area").value, format: field("format").value, funnel: field("funnel").value };
          const novo = buildScript({ ...base, title: field("title").value }, store.perfil);
          CAMPOS_ROTEIRO.forEach(([key]) => { field(`script.${key}`).value = novo[key] ?? ""; });
          toast("Roteiro regerado. Salve para manter.");
        }

        if (action === "copiar") {
          const texto = CAMPOS_ROTEIRO
            .map(([key, label]) => `${label}\n${field(`script.${key}`).value}`)
            .join("\n\n");
          navigator.clipboard?.writeText(texto)
            .then(() => toast("Roteiro copiado."))
            .catch(() => toast("Não foi possível copiar.", "erro"));
        }

        if (action === "duplicar") {
          store.duplicar(id);
          closeModal();
          toast("Cópia criada como rascunho.");
        }

        if (action === "excluir") {
          if (!confirm(`Excluir "${item.title}"? Não dá para desfazer.`)) return;
          store.remover(id);
          closeModal();
          toast("Conteúdo excluído.");
        }
      });
    });
  }

  // ---- Cartão de conteúdo reutilizado em Kanban e Biblioteca -------------

  function itemCard(item, { draggable = false } = {}) {
    const status = STATUSES[item.status];
    return `
      <article class="kan-card" data-id="${item.id}"${draggable ? ' draggable="true"' : ""}>
        <div class="kan-cover t-${slugArea(item.area)}">
          <span class="kan-format">${item.format}</span>
          <span class="kan-area">${item.area}</span>
        </div>
        <div class="kan-body">
          <h4>${item.title}</h4>
          <p class="kan-when">${formatDay(item.date)} · ${item.time}</p>
          <div class="kan-tags">${item.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
          <div class="kan-foot">
            <span class="avatar">${initials(store.perfil.nome)}</span>
            ${store.perfil.nome}
            <span class="badge" style="color:${status.color}"><i class="status-dot"></i>${status.label}</span>
          </div>
        </div>
      </article>`;
  }

  function initials(nome) {
    return nome.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  }

  // Abre o editor ao clicar em qualquer cartão com data-id (mas não ao arrastar).
  function wireCardClicks(root = document) {
    root.addEventListener("click", (event) => {
      const card = event.target.closest("[data-id]");
      if (!card || event.target.closest("[data-action]")) return;
      openItem(card.dataset.id);
    });
  }

  return { toast, openModal, closeModal, openItem, itemCard, initials, wireCardClicks };
})();
