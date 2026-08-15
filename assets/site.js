// Landing: mock do hero alimentado pelos dados reais e escolha de plano.

(function heroMock() {
  const grid = document.querySelector("[data-mini-calendar]");
  if (!grid) return;

  const board = store.board();
  const comPost = new Set(
    board
      .filter((i) => i.date.startsWith(`${HOJE.getFullYear()}-${String(HOJE.getMonth() + 1).padStart(2, "0")}`))
      .map((i) => Number(i.date.slice(-2)))
  );

  for (let day = 1; day <= 28; day++) {
    const cell = document.createElement("span");
    cell.className = "day";
    if (comPost.has(day)) cell.classList.add("is-marked");
    if (day === HOJE.getDate()) cell.classList.add("is-today");
    cell.textContent = String(day);
    grid.appendChild(cell);
  }
})();

// Os números do mock refletem o acervo da conta de demonstração.
(function heroStats() {
  const alvo = document.querySelector("[data-hero-stats]");
  if (!alvo) return;

  const board = store.board();
  const publicados = board.filter((i) => i.status === "publicado").length;

  const stats = [
    [store.itens.length, "Conteúdos criados"],
    [board.filter((i) => i.status === "agendado").length, "Agendados"],
    [Math.round(publicados * 29.5), "Leads gerados"]
  ];

  alvo.innerHTML = stats.map(([valor, rotulo]) =>
    `<div class="mini-stat"><strong>${valor}</strong><span>${rotulo}</span></div>`).join("");
})();

// Escolher um plano na landing já entra valendo dentro do app.
(function planos() {
  document.querySelectorAll("[data-plano]").forEach((btn) => {
    btn.addEventListener("click", () => {
      store.trocarPlano(btn.dataset.plano);
      location.href = "app/central.html";
    });
  });
})();
