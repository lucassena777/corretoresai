// Planos dentro do app: troca imediata, com o plano atual marcado.

function initPlanos(root = document) {
  if (!auth.exigirLogin()) return;

  const alvo = root.querySelector("[data-planos]");

  function render() {
    const atual = store.planoId;

    alvo.innerHTML = Object.values(PLANOS).map((plano) => {
      const ativo = plano.id === atual;
      const popular = plano.id === "pro";

      return `
        <article class="plano-card${ativo ? " is-ativo" : ""}${popular ? " is-popular" : ""}">
          ${popular && !ativo ? '<span class="plan-flag">MAIS POPULAR</span>' : ""}
          <div class="plano-topo">
            <span class="icon-tile${popular || ativo ? " is-gold" : ""}"><svg><use href="#${plano.icone}" /></svg></span>
            <div>
              <h2>${plano.label}</h2>
              ${ativo ? '<span class="plano-atual">Seu plano atual</span>' : ""}
            </div>
          </div>

          <p class="plano-resumo">${plano.resumo}</p>

          <p class="plano-preco">${plano.preco}<span>/mês</span></p>

          <ul class="plano-lista">
            ${plano.beneficios.map((b) => `
              <li><svg><use href="#i-check-circle" /></svg>${b}</li>`).join("")}
          </ul>

          ${ativo
            ? '<button class="btn btn-outline btn-block" type="button" disabled>Plano ativo</button>'
            : `<button class="btn ${popular ? "btn-primary" : "btn-outline"} btn-block" type="button" data-trocar="${plano.id}">${plano.cta}</button>`}
        </article>`;
    }).join("");
  }

  alvo.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-trocar]");
    if (!btn) return;

    const novo = PLANOS[btn.dataset.trocar];
    const atual = store.plano;
    const descendo = novo.cota < atual.cota;

    const aviso = descendo
      ? `Mudar para o ${novo.label} reduz sua cota para ${novo.cota} gerações por mês. Continuar?`
      : `Ativar o ${novo.label} por ${novo.preco}/mês? A cota entra valendo na hora.`;

    if (!confirm(aviso)) return;

    store.trocarPlano(novo.id);
    ui.toast(`Plano ${novo.label} ativo. Cota renovada.`);
  });

  store.subscribe(render);
  render();
}

if (!SPA) initPlanos();
