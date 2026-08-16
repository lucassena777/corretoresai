// Landing: mock do hero alimentado pelos dados reais e escolha de plano.

function initLanding(root = document) {
  const grid = root.querySelector("[data-mini-calendar]");

  // A landing é vitrine: mostra sempre o acervo de exemplo, não a conta de quem
  // está logado — senão um cadastro novo veria "0 leads gerados" na home.
  const itens = SEED_ITENS;
  const board = itens.filter((i) => KANBAN.includes(i.status));

  // No arquivo único não existem app/*.html — os links viram rotas de hash.
  if (SPA) {
    root.querySelectorAll('a[href^="app/"]').forEach((a) => {
      const rota = a.getAttribute("href").replace("app/", "").replace(".html", "");
      a.setAttribute("href", `#/${rota}`);
    });
  }

  if (grid && !grid.children.length) {
    const mesAtual = `${HOJE.getFullYear()}-${String(HOJE.getMonth() + 1).padStart(2, "0")}`;
    const comPost = new Set(
      board.filter((i) => i.date.startsWith(mesAtual)).map((i) => Number(i.date.slice(-2)))
    );

    for (let day = 1; day <= 28; day++) {
      const cell = document.createElement("span");
      cell.className = "day";
      if (comPost.has(day)) cell.classList.add("is-marked");
      if (day === HOJE.getDate()) cell.classList.add("is-today");
      cell.textContent = String(day);
      grid.appendChild(cell);
    }
  }

  // Os números do mock refletem o acervo da conta de demonstração.
  const alvo = root.querySelector("[data-hero-stats]");
  if (alvo) {
    const publicados = board.filter((i) => i.status === "publicado").length;
    const stats = [
      [itens.length, "Conteúdos criados"],
      [board.filter((i) => i.status === "agendado").length, "Agendados"],
      [Math.round(publicados * 29.5), "Leads gerados"]
    ];
    alvo.innerHTML = stats.map(([valor, rotulo]) =>
      `<div class="mini-stat"><strong>${valor}</strong><span>${rotulo}</span></div>`).join("");
  }

  // Os planos vêm da mesma fonte que o app, para nunca divergirem.
  const grade = root.querySelector("[data-plans]");
  if (grade) {
    grade.innerHTML = Object.values(PLANOS).map((plano) => {
      const popular = plano.id === "pro";
      return `
        <article class="plan${popular ? " is-popular" : ""}">
          ${popular ? '<span class="plan-flag">MAIS POPULAR</span>' : ""}
          <div class="plan-head">
            <span class="icon-tile${popular ? " is-gold" : ""}"><svg><use href="#${plano.icone}" /></svg></span>
            <h3>${plano.label}</h3>
          </div>
          <p class="plan-note">${plano.resumo}</p>
          <p class="plan-price">${plano.preco} <span>/mês</span></p>
          <ul class="plan-features">${plano.beneficios.map((b) => `<li>${b}</li>`).join("")}</ul>
          <button class="btn ${popular ? "btn-primary" : "btn-outline"} btn-block" type="button" data-plano="${plano.id}">${plano.cta}</button>
        </article>`;
    }).join("");
  }

  root.addEventListener("click", async (event) => {
    // Escolher um plano leva para o cadastro já com esse plano em mente.
    const plano = event.target.closest("[data-plano]");
    if (plano) {
      try { sessionStorage.setItem("corretoresai-plano-escolhido", plano.dataset.plano); } catch { /* ok */ }
      location.href = SPA ? "#/entrar?modo=cadastro" : "app/entrar.html?modo=cadastro";
      return;
    }

    // "Ver a plataforma" entra direto na conta de demonstração.
    if (event.target.closest("[data-ver-plataforma]")) {
      await db.garantirDemo();
      await db.entrar(db.CREDENCIAIS_DEMO.email, db.CREDENCIAIS_DEMO.senha);
      store.recarregar();
      location.href = SPA ? "#/dashboard" : "app/dashboard.html";
    }
  });
}

if (!SPA) initLanding();
