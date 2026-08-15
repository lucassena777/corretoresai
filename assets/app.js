// Calendário editorial do mock — dias 1..28, alguns marcados, 13 como "hoje".
(function buildCalendar() {
  const grid = document.getElementById("calendar");
  if (!grid) return;

  const marked = new Set([4, 7, 10, 14, 18, 21, 25]);
  const today = 13;

  for (let day = 1; day <= 28; day++) {
    const cell = document.createElement("span");
    cell.className = "day";
    if (marked.has(day)) cell.classList.add("is-marked");
    if (day === today) cell.classList.add("is-today");
    cell.textContent = String(day);
    grid.appendChild(cell);
  }
})();

// Alternância de tema, persistida no navegador.
(function themeToggle() {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  const saved = localStorage.getItem("corretoresai-theme");
  if (saved) root.dataset.theme = saved;

  btn.addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    localStorage.setItem("corretoresai-theme", next);
  });
})();
