// Alternância de tema, compartilhada entre a landing e o app.
// Toda leitura/escrita é protegida: em iframe restrito o localStorage lança.

(function theme() {
  const root = document.documentElement;
  const KEY = "corretoresai-theme";

  const ler = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const gravar = (v) => { try { localStorage.setItem(KEY, v); } catch { /* sem persistência */ } };

  root.dataset.theme = ler() || "dark";

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-theme-toggle]")) return;
    const proximo = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = proximo;
    gravar(proximo);
  });
})();
