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
    // Sem isto, uma faixa que antes foi recado bom continua verde ao virar
    // erro — e o corretor lê "deu errado" com cara de "deu certo".
    alvo.classList.remove("is-bom");
    if (campo) campo.focus();
    alvo.scrollIntoView?.({ block: "nearest" });
  }

  // Mesma faixa do erro, com cara de recado bom.
  function avisar(form, mensagem) {
    const alvo = form.querySelector("[data-erro]");
    alvo.textContent = mensagem;
    alvo.hidden = false;
    alvo.classList.add("is-bom");
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
      // A conta existe e a senha está certa: o que falta é a confirmação. Sem
      // esta saída, o corretor fica preso — o primeiro link pode ter sumido no
      // spam ou nem ter sido entregue, e não havia como pedir outro.
      if (/confirmad/i.test(e.message)) ofereceReenvio(formEntrar.email.value.trim());
      else if (/incorretos/i.test(e.message)) ofereceCadastro(formEntrar.email.value.trim());
    }
  });

  // O Supabase devolve o mesmo "credenciais inválidas" para senha errada e para
  // e-mail que nunca teve conta — de propósito, para não revelar quem é
  // cliente. O efeito colateral é cruel: quem tentou se cadastrar num momento
  // em que o cadastro falhou acha que tem conta, digita a senha certa, e recebe
  // "e-mail ou senha incorretos" para sempre, sem nunca desconfiar de que a
  // conta não existe. Este atalho é a saída dessa armadilha.
  function ofereceCadastro(email) {
    const alvo = formEntrar.querySelector("[data-erro]");
    if (alvo.querySelector("[data-criar]")) return;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.dataset.criar = "";
    botao.className = "link";
    botao.textContent = "Ainda não tenho conta — criar agora";

    botao.addEventListener("click", () => {
      mostrar("cadastro");
      if (email) formCadastro.email.value = email;
      formCadastro.nome.focus();
    });

    alvo.append(" ", botao);
  }

  function ofereceReenvio(email) {
    const alvo = formEntrar.querySelector("[data-erro]");
    if (!email || alvo.querySelector("[data-reenviar]")) return;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.dataset.reenviar = "";
    botao.className = "link";
    botao.textContent = "Reenviar confirmação";

    botao.addEventListener("click", async () => {
      botao.disabled = true;
      try {
        await db.reenviarConfirmacao(email);
        avisar(formEntrar, `Novo link enviado para ${email}. Confira também a caixa de spam.`);
      } catch (e) {
        erro(formEntrar, e.message);
      }
    });

    alvo.append(" ", botao);
  }

  formCadastro.addEventListener("submit", async (event) => {
    event.preventDefault();
    const f = formCadastro;

    const vazio = faltando(f, ["nome", "email", "cidade", "senha"]);
    if (vazio) return erro(f, "Preencha nome, e-mail, cidade e senha para criar a conta.", vazio);

    try {
      const conta = await db.criarConta({
        nome: f.nome.value,
        email: f.email.value,
        senha: f.senha.value,
        cidade: f.cidade.value,
        creci: f.creci.value,
        telefone: f.telefone.value
      });

      // Com confirmação de e-mail ligada, a conta nasce sem sessão: não dá
      // para entrar antes de clicar no link.
      //
      // O texto não afirma que a conta é nova de propósito. O Supabase
      // responde sucesso mesmo quando o e-mail já tem cadastro — é assim para
      // não revelar quem é cliente — e prometer "conta criada" seria mentira
      // na metade dos casos.
      if (conta.confirmarEmail) {
        mostrar("entrar");
        avisar(formEntrar,
          `Enviamos um link de confirmação para ${conta.email}. Confirme e entre por aqui — ` +
          `se esse e-mail já tinha conta, use "Esqueci minha senha".`);
        return;
      }

      store.recarregar();
      if (f.exemplos.checked) store.carregarExemplos();

      // Plano clicado lá na landing: leva para o pagamento, não concede.
      //
      // Antes isto marcava o plano pago direto no estado local. Não dava
      // acesso de verdade — o servidor sempre cobrou pela coluna `plano` do
      // banco, que só o webhook escreve — mas a tela passava a anunciar
      // "Corretor Pro" para quem não pagou, até o primeiro recarregamento
      // desmentir. Prometer plano que não existe é pior do que não prometer.
      const escolhido = sessionStorage.getItem("corretoresai-plano-escolhido");
      if (escolhido && PLANOS[escolhido] && escolhido !== "gratuito") {
        sessionStorage.removeItem("corretoresai-plano-escolhido");
        location.href = auth.urlApp("planos");
        return;
      }

      entrarNoApp();
    } catch (e) {
      erro(f, e.message);
    }
  });

  root.querySelector("[data-esqueci]")?.addEventListener("click", async () => {
    const email = formEntrar.email.value.trim();
    if (!email) return erro(formEntrar, "Escreva seu e-mail acima para receber o link.", formEntrar.email);

    try {
      await db.recuperarSenha(email);
      avisar(formEntrar, `Se existir conta com ${email}, o link de nova senha chega em instantes.`);
    } catch (e) {
      erro(formEntrar, e.message);
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

  // Volta do link de confirmação de e-mail. Ver o bloco em db.js: o token
  // chega no fragmento do endereço e desaparece se ninguém ler — era isso que
  // fazia o corretor cair aqui sem sinal nenhum de que a conta foi confirmada.
  async function conferirVoltaDoEmail() {
    let volta;
    try {
      volta = await db.absorverRetornoDoEmail();
    } catch (e) {
      return erro(formEntrar, e.message);
    }
    if (!volta) return;

    if (volta.tipo === "erro") {
      mostrar("entrar");
      erro(formEntrar, volta.mensagem);
      return;
    }

    // Link de nova senha que caiu aqui por engano (um destino antigo, guardado
    // na Site URL do projeto): manda para a tela que sabe concluir a troca.
    if (volta.tipo === "recovery") {
      location.href = "redefinir.html";
      return;
    }

    // Confirmação: a conta acabou de ser validada e a sessão já está aberta.
    entrarNoApp();
  }

  mostrar(routeParams().get("modo") === "cadastro" ? "cadastro" : "entrar");
  conferirVoltaDoEmail();
}

if (!SPA) initEntrar();
