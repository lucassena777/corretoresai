// Planos dentro do app.
//
// Assinar não é mais um clique que muda um número aqui: abre o checkout do
// Stripe. Quem libera o plano é o webhook, do outro lado — o banco nem deixa
// esta tela escrever na coluna `plano`. É o que faz a cobrança valer alguma
// coisa: sem isso, bastaria abrir o console para virar assinante.

function initPlanos(root = document) {
  if (!auth.exigirLogin()) return;

  const alvo = root.querySelector("[data-planos]");
  let ocupado = false;

  function render() {
    const atual = store.planoId;

    alvo.innerHTML = Object.values(PLANOS).map((plano) => {
      const ativo = plano.id === atual;
      const popular = plano.id === "pro";
      const gratuito = plano.id === "gratuito";

      let acao;
      if (ativo) {
        acao = '<button class="btn btn-outline btn-block" type="button" disabled>Plano ativo</button>';
      } else if (gratuito) {
        // Descer de plano é cancelar assinatura, e isso se faz no Stripe.
        acao = '<button class="btn btn-quiet btn-block" type="button" data-cancelar>Voltar para o gratuito</button>';
      } else {
        acao = `<button class="btn ${popular ? "btn-primary" : "btn-outline"} btn-block" type="button" data-assinar="${plano.id}">${plano.cta}</button>`;
      }

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

          ${acao}
        </article>`;
    }).join("");
  }

  async function assinar(planoId) {
    if (ocupado) return;
    const plano = PLANOS[planoId];

    const ok = await ui.confirmar(
      `Assinar o ${plano.label} por ${plano.preco}/mês? Você vai para o pagamento seguro do Stripe e volta para cá no fim.`,
      { titulo: `Assinar ${plano.label}`, acao: "Ir para o pagamento" });
    if (!ok) return;

    ocupado = true;
    const botao = alvo.querySelector(`[data-assinar="${planoId}"]`);
    if (botao) { botao.disabled = true; botao.textContent = "Abrindo o pagamento…"; }

    try {
      const resposta = await fetch(CONFIG.checkoutUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${db.tokenAtual()}`,
          "apikey": CONFIG.supabaseChave
        },
        body: JSON.stringify({ plano: planoId })
      });

      if (!resposta.ok) throw await CONFIG.erroDaResposta(resposta);

      const { url } = await resposta.json();
      if (!url) throw new Error("O Stripe não devolveu o endereço do pagamento.");

      location.href = url;
    } catch (e) {
      ocupado = false;
      render();
      ui.toast(e instanceof TypeError ? CONFIG.diagnosticar(e) : e.message, "erro");
    }
  }

  alvo.addEventListener("click", async (event) => {
    const assinatura = event.target.closest("[data-assinar]");
    if (assinatura) return assinar(assinatura.dataset.assinar);

    if (event.target.closest("[data-cancelar]")) {
      await ui.confirmar(
        "O cancelamento é feito no mesmo lugar do pagamento: procure o e-mail do Stripe com o recibo — " +
        "ele traz o link para gerenciar ou cancelar a assinatura. Seus conteúdos continuam salvos.",
        { titulo: "Voltar para o gratuito", acao: "Entendi" });
    }
  });

  // Voltando do Stripe: o plano só muda quando o webhook confirma o pagamento,
  // e isso leva alguns segundos. Reler o banco algumas vezes evita mostrar
  // "gratuito" para quem acabou de pagar.
  async function conferirVoltaDoPagamento() {
    const resultado = routeParams().get("pagamento");
    if (!resultado) return;

    if (resultado === "cancelado") {
      ui.toast("Pagamento cancelado. Nada foi cobrado.");
      return;
    }

    ui.toast("Pagamento recebido. Liberando seu plano…");

    for (let tentativa = 0; tentativa < 6; tentativa++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        await db.sincronizar();
        store.recarregar();
        if (store.planoId !== "gratuito") {
          ui.toast(`Plano ${store.plano.label} ativo. Bom proveito.`);
          return;
        }
      } catch { /* tenta de novo */ }
    }

    ui.toast("O pagamento foi aprovado, mas o plano ainda não apareceu. Recarregue em instantes.", "erro");
  }

  store.subscribe(render);
  render();
  conferirVoltaDoPagamento();
}

if (!SPA) initPlanos();
