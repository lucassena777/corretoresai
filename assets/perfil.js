// Perfil e configurações: seleção múltipla de áreas e reset da demonstração.

(function perfil() {
  const areas = document.querySelector('[data-choice="areas"]');
  areas.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    const on = btn.getAttribute("aria-pressed") === "true";
    btn.setAttribute("aria-pressed", String(!on));
  });

  document.querySelector("[data-reset]").addEventListener("click", (event) => {
    localStorage.removeItem("corretoresai-conteudos");
    event.target.textContent = "Acervo restaurado";
    setTimeout(() => { event.target.textContent = "Restaurar o acervo original"; }, 2000);
  });
})();
