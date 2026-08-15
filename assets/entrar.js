// Login e cadastro.

function initEntrar(root = document) {
  const abas = root.querySelector("[data-modo]");
  const formEntrar = root.querySelector('[data-form="entrar"]');
  const formCadastro = root.querySelector('[data-form="cadastro"]');

  db.garantirDemo();

  function mostrar(aba) {
    abas.querySelectorAll("button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.aba === aba)));
    formEntrar.hidden = aba !== "entrar";
    formCadastro.hidden = aba !== "cadastro";
    root.querySelectorAll("[data-erro]").forEach((p) => { p.hidden = true; });
  }

  function erro(form, mensagem) {
    const alvo = form.querySelector("[data-erro]");
    alvo.textContent = mensagem;
    alvo.hidden = false;
  }

  abas.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (btn) mostrar(btn.dataset.aba);
  });

  root.querySelectorAll("[data-ir]").forEach((btn) => {
    btn.addEventListener("click", () => mostrar(btn.dataset.ir));
  });

  // Olhinho de mostrar/esconder senha.
  root.querySelectorAll("[data-ver-senha]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const campo = btn.previousElementSibling;
      const oculto = campo.type === "password";
      campo.type = oculto ? "text" : "password";
      btn.setAttribute("aria-label", oculto ? "Esconder senha" : "Mostrar senha");
      btn.classList.toggle("is-on", oculto);
    });
  });

  function entrarNoApp() {
    store.recarregar();
    location.href = auth.urlApp("dashboard");
  }

  formEntrar.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await db.entrar(formEntrar.email.value, formEntrar.senha.value);
      entrarNoApp();
    } catch (e) {
      erro(formEntrar, e.message);
    }
  });

  formCadastro.addEventListener("submit", async (event) => {
    event.preventDefault();
    const f = formCadastro;
    try {
      await db.criarConta({
        nome: f.nome.value,
        email: f.email.value,
        senha: f.senha.value,
        cidade: f.cidade.value,
        creci: f.creci.value,
        telefone: f.telefone.value
      });

      store.recarregar();

      // Plano escolhido lá na landing, se houver.
      const escolhido = sessionStorage.getItem("corretoresai-plano-escolhido");
      if (escolhido && PLANOS[escolhido]) {
        store.trocarPlano(escolhido);
        sessionStorage.removeItem("corretoresai-plano-escolhido");
      }

      if (f.exemplos.checked) store.carregarExemplos();
      entrarNoApp();
    } catch (e) {
      erro(f, e.message);
    }
  });

  root.querySelector("[data-demo]").addEventListener("click", async () => {
    try {
      await db.garantirDemo();
      await db.entrar(db.CREDENCIAIS_DEMO.email, db.CREDENCIAIS_DEMO.senha);
      entrarNoApp();
    } catch (e) {
      erro(formEntrar, e.message);
    }
  });

  mostrar(routeParams().get("modo") === "cadastro" ? "cadastro" : "entrar");
}

if (!SPA) initEntrar();
