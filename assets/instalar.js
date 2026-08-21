// Convite para instalar o site na tela de início do iPhone.
//
// O iOS não oferece o "instalar" automático que o Android tem: no iPhone, o
// caminho é Compartilhar → Adicionar à Tela de Início, e quem não sabe disso
// nunca descobre sozinho. Daí o convite existir — e daí ele mostrar o ícone
// real que vai aparecer na tela, para a pessoa reconhecer o que acabou de
// instalar.
//
// Três regras que decidem se ele aparece, e todas existem para o convite não
// virar incômodo:
//   1. Só em iPhone ou iPad. Em Android o navegador já tem o botão próprio.
//   2. Nunca quando o site já está rodando instalado — seria convidar quem já
//      aceitou.
//   3. Uma dispensa vale por seis meses. Não é "para sempre" porque quem trocar
//      de aparelho perde o atalho e não teria como reencontrar o caminho.

const instalar = (() => {
  const CHAVE = "corretoresai-instalar-dispensado";
  const SEIS_MESES = 1000 * 60 * 60 * 24 * 180;
  const ESPERA = 2500;

  const ICONE_APP = "/icones/icone-180.png";

  function noIphone() {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    // iPad moderno se anuncia como Mac; o toque é o que o desmente.
    const iPadNovo = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    return /iPhone|iPad|iPod/.test(ua) || iPadNovo;
  }

  function jaInstalado() {
    if (typeof navigator !== "undefined" && navigator.standalone) return true;
    try { return window.matchMedia("(display-mode: standalone)").matches; }
    catch { return false; }
  }

  function dispensadoRecentemente() {
    try {
      const quando = Number(localStorage.getItem(CHAVE));
      return Boolean(quando) && Date.now() - quando < SEIS_MESES;
    } catch { return false; }
  }

  function dispensar() {
    try { localStorage.setItem(CHAVE, String(Date.now())); } catch { /* modo privado */ }
  }

  const PASSOS = [
    {
      titulo: "Toque em Compartilhar",
      texto: "É o quadrado com a seta para cima, na barra de baixo do Safari.",
      icone: '<path d="M12 15V4M12 4L8.5 7.5M12 4l3.5 3.5"/><path d="M6 12v6.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V12"/>'
    },
    {
      titulo: "Deslize a lista para baixo",
      texto: 'A opção que você procura fica depois dos aplicativos: "Adicionar à Tela de Início".',
      icone: '<path d="M4 7h16M4 12h16M4 17h10"/><path d="M17 15l2.5 2.5L22 15"/>'
    },
    {
      titulo: 'Toque em "Adicionar à Tela de Início"',
      texto: 'Confirme em "Adicionar", no canto superior direito.',
      icone: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8.5v7M8.5 12h7"/>'
    },
    {
      titulo: "Pronto",
      texto: "O ícone fica junto dos seus apps e abre em tela cheia, sem a barra do navegador.",
      icone: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>'
    }
  ];

  function montar() {
    const passos = PASSOS.map((p, i) => `
      <li class="instalar-passo">
        <span class="instalar-numero">${i + 1}</span>
        <span class="instalar-icone" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
               stroke-linecap="round" stroke-linejoin="round">${p.icone}</svg>
        </span>
        <span class="instalar-texto">
          <strong>${p.titulo}</strong>
          <span>${p.texto}</span>
        </span>
      </li>`).join("");

    const caixa = document.createElement("div");
    caixa.className = "instalar-fundo";
    caixa.setAttribute("hidden", "");
    caixa.innerHTML = `
      <div class="instalar-cartao" role="dialog" aria-modal="true"
           aria-labelledby="instalar-titulo" aria-describedby="instalar-sub">
        <button class="instalar-fechar" type="button" data-fechar aria-label="Fechar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>

        <div class="instalar-topo">
          <img class="instalar-logo" src="${ICONE_APP}" alt="" width="72" height="72" />
          <div>
            <h2 id="instalar-titulo">Adicione à Tela de Início</h2>
            <p id="instalar-sub">
              Fica igual a um app do iPhone: abre em tela cheia, sem a barra do
              navegador, e com o ícone junto dos seus outros aplicativos.
            </p>
          </div>
        </div>

        <ol class="instalar-passos">${passos}</ol>

        <div class="instalar-rodape">
          <button class="btn btn-primary btn-block" type="button" data-fechar>Entendi</button>
          <button class="link instalar-nunca" type="button" data-nunca>Não mostrar de novo</button>
        </div>
      </div>`;

    document.body.appendChild(caixa);
    return caixa;
  }

  let caixa = null;
  let devolverFoco = null;

  function fechar() {
    if (!caixa) return;
    caixa.setAttribute("hidden", "");
    document.body.classList.remove("instalar-aberto");
    devolverFoco?.focus?.();
  }

  function abrir() {
    if (!caixa) caixa = montar();
    devolverFoco = document.activeElement;
    caixa.removeAttribute("hidden");
    document.body.classList.add("instalar-aberto");
    caixa.querySelector("[data-fechar]")?.focus();
  }

  function ligar() {
    if (!caixa) caixa = montar();

    caixa.addEventListener("click", (e) => {
      // Clique no fundo escuro também fecha — é o gesto que a pessoa tenta.
      if (e.target === caixa) return fechar();
      if (e.target.closest("[data-nunca]")) { dispensar(); return fechar(); }
      if (e.target.closest("[data-fechar]")) fechar();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !caixa.hasAttribute("hidden")) fechar();
    });
  }

  function talvezMostrar() {
    if (!noIphone() || jaInstalado() || dispensadoRecentemente()) return;
    ligar();
    setTimeout(abrir, ESPERA);
  }

  return { abrir, fechar, talvezMostrar, noIphone, jaInstalado };
})();

// SPA é a prévia de arquivo único, que não tem ícone nem manifesto para instalar.
if (typeof SPA === "undefined" || !SPA) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", instalar.talvezMostrar);
  } else {
    instalar.talvezMostrar();
  }
}
