// Histórico: linha do tempo agrupada por dia, com filtro por tipo de evento.

function initHistorico(root = document) {
  if (!auth.exigirLogin()) return;

  const abas = root.querySelector("[data-abas]");
  const timeline = root.querySelector("[data-timeline]");
  let aba = "tudo";

  const DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
    "Quinta-feira", "Sexta-feira", "Sábado"];

  const PUBLICACAO = new Set(["i-send", "i-kanban", "i-calendar", "i-calendar-clock"]);
  const EDICAO = new Set(["i-wand", "i-copy", "i-trash", "i-user", "i-settings", "i-card"]);

  function combina(evento) {
    if (aba === "publicacoes") return PUBLICACAO.has(evento.icon);
    if (aba === "edicoes") return EDICAO.has(evento.icon);
    return true;
  }

  function tituloDoDia(ts) {
    const data = new Date(ts);
    const hoje = new Date();
    const mesmoDia = (a, b) => a.toDateString() === b.toDateString();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    if (mesmoDia(data, hoje)) return "Hoje";
    if (mesmoDia(data, ontem)) return "Ontem";
    return `${DIAS[data.getDay()]}, ${data.getDate()} de ${MESES[data.getMonth()].toLowerCase()}`;
  }

  function render() {
    const eventos = store.atividades.filter(combina);

    if (!eventos.length) {
      timeline.innerHTML = `
        <div class="empty">
          <span class="icon-tile"><svg><use href="#i-history" /></svg></span>
          <strong>Nada registrado ainda</strong>
          <p>Assim que você gerar, aprovar ou mover um conteúdo, ele aparece aqui.</p>
          <a class="btn btn-primary" href="central.html"><svg><use href="#i-plus" /></svg>Criar conteúdo</a>
        </div>`;
      return;
    }

    // Agrupa por dia, mantendo a ordem decrescente.
    const grupos = [];
    for (const evento of eventos) {
      const chave = new Date(evento.at).toDateString();
      const ultimo = grupos.at(-1);
      if (ultimo && ultimo.chave === chave) ultimo.itens.push(evento);
      else grupos.push({ chave, at: evento.at, itens: [evento] });
    }

    timeline.innerHTML = grupos.map((grupo) => `
      <section class="tl-grupo">
        <header>${tituloDoDia(grupo.at)}</header>
        <ul>
          ${grupo.itens.map((e) => `
            <li>
              <span class="icon-tile"><svg><use href="#${e.icon}" /></svg></span>
              <p>${e.text}</p>
              <time>${relativeTime(e.at)}</time>
            </li>`).join("")}
        </ul>
      </section>`).join("");
  }

  abas.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    aba = btn.dataset.aba;
    abas.querySelectorAll("button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.aba === aba)));
    render();
  });

  store.subscribe(render);
  render();
}

if (!SPA) initHistorico();
