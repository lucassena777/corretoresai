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

  // Confirmação própria: o confirm() nativo é bloqueado dentro de iframes
  // protegidos (como o da prévia publicada) e volta "não" sem avisar ninguém.
  function confirmar(mensagem, { titulo = "Confirmar", acao = "Confirmar", perigo = false } = {}) {
    return new Promise((resolve) => {
      let decidido = false;
      const responder = (valor) => { if (!decidido) { decidido = true; resolve(valor); } };

      openModal(`
        <header class="modal-head">
          <div><h2>${titulo}</h2></div>
        </header>
        <div class="modal-body"><p class="confirm-texto">${mensagem}</p></div>
        <footer class="modal-foot">
          <button class="btn btn-outline" type="button" data-nao>Cancelar</button>
          <button class="btn ${perigo ? "btn-outline is-danger" : "btn-primary"}" type="button" data-sim>${acao}</button>
        </footer>`, (modal) => {
        modal.querySelector("[data-sim]").addEventListener("click", () => { responder(true); closeModal(); });
        modal.querySelector("[data-nao]").addEventListener("click", () => { responder(false); closeModal(); });
        modal.querySelector("[data-sim]").focus();
        // Fechar clicando fora ou no Esc conta como cancelar.
        new MutationObserver((_, obs) => {
          if (!document.body.contains(modal)) { responder(false); obs.disconnect(); }
        }).observe(document.body, { childList: true });
      });
    });
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
          confirmar(`Excluir "${item.title}"? Não dá para desfazer.`,
            { titulo: "Excluir conteúdo", acao: "Excluir", perigo: true }).then((ok) => {
            if (!ok) return;
            store.remover(id);
            closeModal();
            toast("Conteúdo excluído.");
          });
        }
      });
    });
  }

  // ---- Cartão de conteúdo reutilizado em Kanban e Biblioteca -------------

  function itemCard(item, { draggable = false, resumo = false, data = false } = {}) {
    const status = STATUSES[item.status];
    const nome = store.perfil.nome || "Você";

    return `
      <article class="content-card" data-id="${item.id}"${draggable ? ' draggable="true"' : ""}>
        <div class="card-cover t-${slugArea(item.area)}">
          <span class="card-format">${item.format}</span>
          <span class="card-cover-foot">
            <span>${item.area}</span>
            ${data ? `<span>${formatDay(item.date)} · ${item.time}</span>` : ""}
          </span>
        </div>
        <div class="card-body">
          <div class="card-title">
            <h4>${item.title}</h4>
            <button class="card-menu" type="button" data-menu aria-label="Ações do conteúdo">···</button>
          </div>
          ${resumo
            ? `<p class="card-resumo">${store.roteiro(item).gancho}</p>`
            : `<p class="card-when">${formatDay(item.date)} · ${item.time}</p>`}
          <div class="card-tags">${item.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
          <div class="card-foot">
            <span class="avatar">${initials(nome)}</span>
            ${nome}
            <span class="badge" style="color:${status.color}"><i class="status-dot"></i>${status.label}</span>
          </div>
        </div>
      </article>`;
  }

  function initials(nome) {
    return (nome || "?").split(/\s+/).filter(Boolean).slice(0, 2)
      .map((p) => p[0].toUpperCase()).join("") || "?";
  }

  // ---- Menu "···" do cartão ---------------------------------------------

  function fecharMenus() {
    document.querySelectorAll(".pop-menu").forEach((m) => m.remove());
  }

  function abrirMenuCartao(botao, id) {
    fecharMenus();
    const item = store.find(id);
    if (!item) return;

    const acoes = [
      ["editar", "Abrir e editar", "i-wand"],
      ["duplicar", "Duplicar", "i-copy"],
      ...Object.keys(STATUSES)
        .filter((s) => s !== item.status)
        .map((s) => [`status:${s}`, `Marcar como ${STATUSES[s].label}`, "i-check-circle"]),
      ["excluir", "Excluir", "i-trash"]
    ];

    const menu = document.createElement("div");
    menu.className = "pop-menu";
    menu.innerHTML = acoes.map(([acao, texto, ico]) =>
      `<button type="button" data-acao="${acao}" class="${acao === "excluir" ? "is-danger" : ""}">
         <svg><use href="#${ico}" /></svg>${texto}
       </button>`).join("");

    const r = botao.getBoundingClientRect();
    menu.style.top = `${r.bottom + window.scrollY + 6}px`;
    menu.style.left = `${Math.min(r.left + window.scrollX, window.innerWidth - 240)}px`;
    document.body.appendChild(menu);

    menu.addEventListener("click", (event) => {
      const acao = event.target.closest("[data-acao]")?.dataset.acao;
      if (!acao) return;
      fecharMenus();

      if (acao === "editar") return openItem(id);
      if (acao === "duplicar") { store.duplicar(id); return toast("Cópia criada como rascunho."); }
      if (acao === "excluir") {
        confirmar(`Excluir "${item.title}"? Não dá para desfazer.`,
          { titulo: "Excluir conteúdo", acao: "Excluir", perigo: true }).then((ok) => {
          if (ok) { store.remover(id); toast("Conteúdo excluído."); }
        });
        return;
      }
      if (acao.startsWith("status:")) {
        const novo = acao.split(":")[1];
        store.atualizar(id, { status: novo });
        toast(`Marcado como ${STATUSES[novo].label}.`);
      }
    });
  }

  document.addEventListener("click", (event) => {
    const botao = event.target.closest("[data-menu]");
    if (botao) {
      event.stopPropagation();
      abrirMenuCartao(botao, botao.closest("[data-id]").dataset.id);
      return;
    }
    if (!event.target.closest(".pop-menu")) fecharMenus();
  });

  // ---- Exportação --------------------------------------------------------

  function textoDoItem(item) {
    const r = store.roteiro(item);
    const cabecalho = `${item.title}\n${formatFull(item.date)} · ${item.time} · ${item.format} · ${item.area} · ${STATUSES[item.status].label}`;
    const corpo = CAMPOS_ROTEIRO.map(([k, rotulo]) => `${rotulo}:\n${r[k] ?? ""}`).join("\n\n");
    return `${cabecalho}\n${"-".repeat(52)}\n${corpo}`;
  }

  function exportarTexto(lista) {
    const texto = lista.map(textoDoItem).join(`\n\n${"=".repeat(52)}\n\n`);
    navigator.clipboard?.writeText(texto)
      .then(() => toast(`${lista.length} ${lista.length === 1 ? "conteúdo copiado" : "conteúdos copiados"} para a área de transferência.`))
      .catch(() => toast("Não foi possível copiar.", "erro"));
  }

  return { toast, openModal, closeModal, confirmar, openItem, itemCard, initials,
    exportarTexto, textoDoItem, fecharMenus };
})();
