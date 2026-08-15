// Calendário do mock no hero — dias 1..28, alguns marcados, 13 como "hoje".
(function miniCalendar() {
  const grid = document.querySelector("[data-mini-calendar]");
  if (!grid) return;

  const marked = new Set([4, 7, 10, 14, 18, 21, 25]);

  for (let day = 1; day <= 28; day++) {
    const cell = document.createElement("span");
    cell.className = "day";
    if (marked.has(day)) cell.classList.add("is-marked");
    if (day === 13) cell.classList.add("is-today");
    cell.textContent = String(day);
    grid.appendChild(cell);
  }
})();
