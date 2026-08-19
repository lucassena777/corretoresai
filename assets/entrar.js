const auth = supabaseClient.auth;
auth.urlApp = function(page) { return page + ".html"; };

function initEntrar(root = document) {
  const abas = root.querySelector("[data-modo]");
  const formEntrar = root.querySelector('[data-form="entrar"]');
  const formCadastro = root.querySelector('[data-form="cadastro"]') || root.querySelector('form');

  db.garantirDemo();

  function mostrar(aba) {
    if (abas) {
      abas.querySelectorAll("button").forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.aba === aba))
      );
    }
    if (formEntrar) formEntrar.hidden = aba !== "entrar";
    if (formCadastro) formCadastro.hidden = aba !== "cadastro";
    root.querySelectorAll("[data-erro]").forEach((p) => { p.hidden = true; });
  }

  function erro(form, mensagem) {
    if (!form) return;
    const alvo = form.querySelector("[data-erro]");
    if (alvo) {
      alvo.textContent = mensagem;
      alvo.hidden = false;
    } else {
      alert(mensagem);
    }
  }

  if (abas) {
    abas.addEventListener("click", (event) => {
      const btn = event.target.closest("button");
      if (btn && btn.dataset.aba) mostrar(btn.dataset.aba);
    });
  }

  root.querySelectorAll("[data-ir]").forEach((btn) => {
    btn.addEventListener("click", () => mostrar(btn.dataset.ir));
  });

  // Olho de mostrar/esconder senha
  root.querySelectorAll("[data-ver-senha]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const campo = btn.previousElementSibling;
      if (campo) {
        const oculto = campo.type === "password";
        campo.type = oculto ? "text" : "password";
        btn.setAttribute("aria-label", oculto ? "Esconder senha" : "Mostrar senha");
        btn.classList.toggle("is-on", oculto);
      }
    });
  });

  function entrarNoApp() {
    if (typeof store !== "undefined" && store.recarregar) {
      store.recarregar();
    }
    location.href = "dashboard.html";
  }

  if (formEntrar) {
    formEntrar.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await db.entrar(formEntrar.email.value, formEntrar.senha.value);
        entrarNoApp();
      } catch (e) {
        erro(formEntrar, e.message);
      }
    });
  }

  if (formCadastro) {
    formCadastro.addEventListener("submit", async (event) => {
      event.preventDefault();
      const f = formCadastro;
      try {
        await db.criarConta({
          nome: f.nome ? f.nome.value : "",
          email: f.email ? f.email.value : "",
          senha: f.senha ? f.senha.value : "",
          cidade: f.cidade ? f.cidade.value : "",
          creci: f.creci ? f.creci.value : "",
          telefone: f.telefone ? f.telefone.value : ""
        });

        if (typeof store !== "undefined") {
          if (store.recarregar) store.recarregar();
          if (f.exemplos && f.exemplos.checked && store.carregarExemplos) {
            store.carregarExemplos();
          }
        }

        entrarNoApp();
      } catch (e) {
        erro(formCadastro, e.message);
      }
    });
  }

  const btnDemo = root.querySelector("[data-demo]");
  if (btnDemo) {
    btnDemo.addEventListener("click", async () => {
      try {
        await db.garantirDemo();
        await db.entrar(db.CREDENCIAIS_DEMO.email, db.CREDENCIAIS_DEMO.senha);
        entrarNoApp();
      } catch (e) {
        erro(formEntrar, e.message);
      }
    });
  }

  const modoUrl = (typeof routeParams === "function" && routeParams().get) 
    ? routeParams().get("modo") 
    : "cadastro";
  mostrar(modoUrl === "cadastro" ? "cadastro" : "entrar");
}

initEntrar();
