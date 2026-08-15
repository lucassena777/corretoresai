// Central de Conteúdo: seleção de funil/formato e o roteiro de demonstração.
// A geração ainda é local (sem backend) — monta os 11 campos a partir do briefing.

(function central() {
  // Botões de escolha única
  document.querySelectorAll("[data-choice]").forEach((row) => {
    row.addEventListener("click", (event) => {
      const btn = event.target.closest("button");
      if (!btn) return;
      row.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
    });
  });

  const pressed = (selector) =>
    document.querySelector(`${selector} button[aria-pressed="true"]`)?.textContent.trim() ?? "";

  const form = document.querySelector("[data-generator]");
  const panel = document.querySelector("[data-result]");
  const meta = document.querySelector("[data-result-meta]");
  const body = document.querySelector("[data-result-body]");

  const GANCHOS = {
    Topo: "Todo mundo procura {area} em {cidade} do jeito errado. Olha o que ninguém te conta.",
    Meio: "Antes de escolher {area} em {cidade}, tem três coisas que mudam o preço final.",
    Fundo: "Se você já está decidido por {area} em {cidade}, esse é o momento de agendar a visita.",
    Personalizado: "{area} em {cidade}: a conversa que eu tenho com todo cliente antes de fechar."
  };

  const OBJETIVOS = {
    Topo: "Alcançar quem ainda não pensou em comprar",
    Meio: "Convencer quem está comparando opções",
    Fundo: "Converter quem já está decidido em visita agendada",
    Personalizado: "Campanha sob medida definida por você"
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const area = form.area.value;
    const cidade = form.cidade.value.trim() || "sua cidade";
    const briefing = form.briefing.value.trim();
    const funil = pressed('[data-choice="funil"]');
    const formato = pressed('[data-choice="formato"]');

    const gancho = GANCHOS[funil].replace("{area}", area.toLowerCase()).replace("{cidade}", cidade);

    const campos = [
      ["Título", `${area} em ${cidade}: o que olhar antes de decidir`],
      ["Gancho (0–3s)", gancho],
      ["Desenvolvimento (3–20s)", briefing
        ? `Mostre o imóvel enquanto fala: ${briefing}`
        : `Mostre o imóvel destacando três diferenciais concretos: localização, planta e custo mensal real.`],
      ["Prova (20–35s)", "Traga um número: valor do metro quadrado da região, tempo médio de venda ou economia frente ao aluguel."],
      ["CTA (35–45s)", "Comente “QUERO” que eu mando a ficha completa e a simulação no seu WhatsApp."],
      ["Legenda", `${gancho}\n\nSalve esse post para quando for visitar ${area.toLowerCase()} em ${cidade}. Qualquer dúvida, chama no direct.`],
      ["Hashtags", `#${area.toLowerCase().replace(/\s/g, "")} #${cidade.toLowerCase().replace(/\s/g, "")} #corretordeimoveis #imoveis #${formato.toLowerCase()}`],
      ["Objetivo", OBJETIVOS[funil]],
      ["Público ideal", `Quem procura ${area.toLowerCase()} em ${cidade} e está na etapa de ${funil.toLowerCase()} do funil`],
      ["Formato", `${formato} — corte a cada 3 segundos, legenda queimada e áudio em alta`],
      ["Sugestão de gravação", "Grave na hora dourada, comece já dentro do imóvel e evite plano parado por mais de 4 segundos."]
    ];

    meta.textContent = `${formato} · funil de ${funil.toLowerCase()} · ${area} · ${cidade}`;
    body.innerHTML = `<ul class="activity" style="max-height:none">${campos.map(([nome, valor]) => `
      <li>
        <span class="icon-tile"><svg><use href="#i-check-circle" /></svg></span>
        <div>
          <p><strong>${nome}</strong></p>
          <p style="color:var(--text-muted);white-space:pre-line">${valor}</p>
        </div>
      </li>`).join("")}</ul>
      <p class="hint" style="margin-top:20px">
        Roteiro de demonstração montado no navegador. A geração por IA entra quando
        conectarmos o back-end.
      </p>`;

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
