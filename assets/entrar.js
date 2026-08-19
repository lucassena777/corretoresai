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

  // A validação é nossa, não do navegador: dentro de iframe (a prévia, e o
  // app aberto pelo iPad) o balão nativo do `required` não aparece, e o
  // formulário só não envia — o clique parece morto. Aqui a mensagem sempre
  // aparece na tela, e o foco vai para o campo que falta.
  function erro(form, mensagem, campo) {
    const alvo = form.querySelector("[data-erro]");
    alvo.textContent = mensagem;
    alvo.hidden = false;
    if (campo) campo.focus();
    alvo.scrollIntoView?.({ block: "nearest" });
  }

  // Primeiro campo vazio da lista, ou nada se estiver tudo preenchido.
  function faltando(form, nomes) {
    return nomes.map((n) => form[n]).find((c) => !c.value.trim());
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

    const vazio = faltando(formEntrar, ["email", "senha"]);
    if (vazio) return erro(formEntrar, "Preencha e-mail e senha para entrar.", vazio);

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

    const vazio = faltando(f, ["nome", "email", "cidade", "senha"]);
    if (vazio) return erro(f, "Preencha nome, e-mail, cidade e senha para criar a conta.", vazio);

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
