// Alternância de tema compartilhada entre a landing e o app.
(function theme() {
  const root = document.documentElement;
  const KEY = "corretoresai-theme";

  root.dataset.theme = localStorage.getItem(KEY) || "dark";

  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-theme-toggle]");
    if (!btn) return;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    localStorage.setItem(KEY, next);
  });
})();
