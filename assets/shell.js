// Shell do app: injeta o sprite de ícones, a sidebar e a topbar em todas as telas.
// Cada página só declara data-page / data-title / data-subtitle no <body>.

const ICONS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<symbol id="i-building" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V8l6-4v16"/><path d="M10 20h10V11l-6-2"/><path d="M14 14h2M14 17h2M7 11h1M7 14h1"/></symbol>
<symbol id="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></symbol>
<symbol id="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/></symbol>
<symbol id="i-grid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></symbol>
<symbol id="i-wand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4l5 5L9 20l-5-5z"/><path d="M14 5l5 5M6 4l.8 2L9 6.8 6.8 7.6 6 10l-.8-2.4L3 6.8 5.2 6z"/></symbol>
<symbol id="i-calendar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></symbol>
<symbol id="i-calendar-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11V7.5A2.5 2.5 0 0 0 18.5 5h-13A2.5 2.5 0 0 0 3 7.5v11A2.5 2.5 0 0 0 5.5 21H12"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="17.5" cy="17.5" r="3.5"/><path d="M17.5 16v1.7l1.2.8"/></symbol>
<symbol id="i-kanban" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M9 4v17M15 4v17"/></symbol>
<symbol id="i-book" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 1 4 18.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v18h5.5a2.5 2.5 0 0 0 2.5-2.5z"/></symbol>
<symbol id="i-history" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3 4v4h4"/><path d="M12 7.5V12l3 2"/></symbol>
<symbol id="i-card" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18"/></symbol>
<symbol id="i-user" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c1.2-3.4 4-5.2 7.5-5.2s6.3 1.8 7.5 5.2"/></symbol>
<symbol id="i-settings" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-3-1.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.3-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 3 1.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z"/></symbol>
<symbol id="i-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.6 3.6 5.6 3.6 9S14.4 18.4 12 21c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3z"/></symbol>
<symbol id="i-sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3l1.7 4.6L17.5 9l-4.8 1.4L11 15l-1.7-4.6L4.5 9l4.8-1.4z"/><path d="M18 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/></symbol>
<symbol id="i-logout" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M9 12h11M17 9l3 3-3 3"/></symbol>
<symbol id="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></symbol>
<symbol id="i-chev-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6l-6 6 6 6"/></symbol>
<symbol id="i-chev-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 6l6 6-6 6"/></symbol>
<symbol id="i-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></symbol>
<symbol id="i-send" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3L10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8z"/></symbol>
<symbol id="i-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></symbol>
<symbol id="i-user-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="8" r="4"/><path d="M3 20c1.1-3.2 3.7-5 7-5 1.2 0 2.3.2 3.3.7"/><path d="M18 14v6M15 17h6"/></symbol>
<symbol id="i-check-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.4l2.4 2.4 4.6-5"/></symbol>
<symbol id="i-external" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-8 8"/><path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></symbol>
<symbol id="i-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></symbol>
<symbol id="i-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/></symbol>
<symbol id="i-film" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M8 5v5M16 5v5"/></symbol>
<symbol id="i-rocket" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4c3.5 0 6 2.5 6 6 0 4.5-4 8-7 10l-3-3c2-3 5.5-7 10-7"/><path d="M9 15l-3-3M7.5 16.5C6 18 6 21 6 21s3 0 4.5-1.5"/></symbol>
<symbol id="i-crown" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18h16M4 18l-1.5-9L8 12l4-7 4 7 5.5-3L20 18"/></symbol>
<symbol id="i-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></symbol>
<symbol id="i-filter" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M7 12h10M10 17h4"/></symbol>
<symbol id="i-download" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 11l4 4 4-4"/><path d="M4 19h16"/></symbol>
<symbol id="i-assistente" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a4 4 0 0 1 4 4v1h1.5A2.5 2.5 0 0 1 20 10.5v5a2.5 2.5 0 0 1-2.5 2.5H14l-3.4 2.6a.6.6 0 0 1-1-.5V18H6.5A2.5 2.5 0 0 1 4 15.5v-5A2.5 2.5 0 0 1 6.5 8H8V7a4 4 0 0 1 4-4z"/><path d="M9.5 12.5h.01M14.5 12.5h.01"/></symbol>
</svg>`;

// href: navegação por arquivos (site multipágina).
// rota: navegação por hash (build de arquivo único).
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "i-grid", href: "dashboard.html", rota: "#/dashboard" },
  { id: "central", label: "Central de Conteúdo", icon: "i-wand", href: "central.html", rota: "#/central" },
  // Kanban não aparece aqui de propósito: é uma aba dentro do Calendário Editorial.
  { id: "calendario", label: "Calendário Editorial", icon: "i-calendar", href: "calendario.html", rota: "#/calendario" },
  { id: "biblioteca", label: "Biblioteca", icon: "i-book", href: "biblioteca.html", rota: "#/biblioteca" },
  { id: "historico", label: "Histórico", icon: "i-history", href: "historico.html", rota: "#/historico" },
  { id: "planos", label: "Planos", icon: "i-card", href: "planos.html", rota: "#/planos" },
  { id: "perfil", label: "Perfil", icon: "i-user", href: "perfil.html", rota: "#/perfil" },
  { id: "configuracoes", label: "Configurações", icon: "i-settings", href: "configuracoes.html", rota: "#/configuracoes" }
];

const LINKS = SPA
  ? { site: "#/", central: "#/central", perfil: "#/perfil" }
  : { site: "../index.html", central: "central.html", perfil: "perfil.html" };

function icon(id, cls = "") {
  return `<svg class="${cls}"><use href="#${id}" /></svg>`;
}

// Parâmetros de rota: ?data=... na URL (multipágina) ou depois do hash (SPA).
function routeParams() {
  const bruto = SPA ? (location.hash.split("?")[1] || "") : location.search.replace(/^\?/, "");
  return new URLSearchParams(bruto);
}

// Abre a Central, opcionalmente já com uma data escolhida.
function goCentral(data) {
  const query = data ? `?data=${data}` : "";
  location.href = SPA ? `#/central${query}` : `central.html${query}`;
}

function shellHTML({ page, title, subtitle }) {
  const links = NAV.map((item) => {
    const atual = item.id === page ? ' aria-current="page"' : "";
    return `<a href="${SPA ? item.rota : item.href}"${atual}>${icon(item.icon)}<span>${item.label}</span></a>`;
  }).join("");

  return `
    <aside class="sidebar">
      <a class="brand" href="${LINKS.site}">
        <span class="brand-mark">${icon("i-building")}</span>
        <span class="brand-stack">
          <span>Corretores<span class="brand-ai">AI</span></span>
          <span class="brand-tag">Central de conteúdo imobiliário</span>
        </span>
      </a>

      <nav class="side-nav" aria-label="Navegação do app">
        ${links}
        <button class="side-assistente" type="button" data-abrir-assistente>
          ${icon("i-assistente")}<span>Assistente IA</span>
        </button>
      </nav>

      <div class="side-foot">
        <div class="plan-box" data-plan-box></div>
        <div class="side-links">
          <a href="${LINKS.site}">${icon("i-globe")}<span>Ver o site</span></a>
          <a href="${LINKS.central}">${icon("i-sparkle")}<span>Introdução</span></a>
          <button type="button" data-sair>${icon("i-logout")}<span>Sair</span></button>
        </div>
      </div>
    </aside>

    <div class="app-col">
      <header class="topbar">
        <div class="topbar-title">
          <strong>${title}</strong>
          <span>${subtitle}</span>
        </div>
        <div class="topbar-actions">
          <button class="theme-btn" type="button" data-theme-toggle aria-label="Alternar tema">
            ${icon("i-sun", "icon-sun")}${icon("i-moon", "icon-moon")}
          </button>
          <a class="user-chip" href="${LINKS.perfil}" data-user-chip></a>
        </div>
      </header>
    </div>`;
}

function renderShell() {
  const body = document.body;
  const view = body.querySelector(".view");

  body.insertAdjacentHTML("afterbegin", ICONS);

  // Telas fora do app (login, cadastro) só precisam do sprite de ícones.
  if (!view) return;

  const shell = document.createElement("div");
  shell.className = "app";
  shell.innerHTML = shellHTML({
    page: body.dataset.page || "",
    title: body.dataset.title || "",
    subtitle: body.dataset.subtitle || ""
  });

  body.appendChild(shell);
  if (view) shell.querySelector(".app-col").appendChild(view);

  ligarSair(shell);
  renderIdentity();
  store.subscribe(renderIdentity);

  // O assistente acompanha toda a área logada.
  if (typeof assistente !== "undefined") {
    assistente.iniciar();
    shell.querySelector("[data-abrir-assistente]")
      ?.addEventListener("click", () => assistente.abrir());
  }
}

function ligarSair(root) {
  root.querySelector("[data-sair]")?.addEventListener("click", async () => {
    const ok = await ui.confirmar("Sair da sua conta? Seus conteúdos continuam salvos.",
      { titulo: "Sair", acao: "Sair" });
    if (ok) auth.sair();
  });
}

// Nome, plano e cota vêm do estado — mudou no perfil, muda aqui na hora.
function renderIdentity() {
  if (!store.logado) return;

  const perfil = store.perfil;
  const plano = store.plano;
  const restantes = store.restantes();
  const ilimitado = restantes === Infinity;
  const usado = ilimitado ? 1 : 1 - restantes / plano.cota;

  const chip = document.querySelector("[data-user-chip]");
  if (chip) {
    chip.innerHTML = `
      <div>
        <b>${perfil.nome}</b>
        <span>${plano.label}</span>
      </div>
      <span class="avatar">${ui.initials(perfil.nome)}</span>`;
  }

  const box = document.querySelector("[data-plan-box]");
  if (box) {
    box.innerHTML = `
      <strong>Plano ${plano.label}</strong>
      <div class="plan-bar"><i style="width:${Math.round(usado * 100)}%"></i></div>
      <span>${ilimitado
        ? "Gerações ilimitadas liberadas."
        : `${restantes} de ${plano.cota} gerações restantes.`}</span>
      ${ilimitado ? "" : `<a class="plan-up" href="${SPA ? "#/planos" : "planos.html"}">Ver planos</a>`}`;
  }

  // "Reduzir animações" vale para o documento inteiro.
  document.documentElement.dataset.anim = store.config.reduzirAnimacoes ? "off" : "on";
}

if (!SPA) renderShell();
