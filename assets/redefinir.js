// Tela de nova senha — o destino do link de "esqueci minha senha".
//
// Esta tela não existia, e por isso o fluxo inteiro de recuperação era um beco
// sem saída: o Supabase mandava o e-mail, o corretor clicava, e caía numa
// página que não sabia o que fazer com o token. Ele então pedia outro link, e
// outro, até bater no limite de envio. Era esse o rastro de 429 no /recover.

function initRedefinir(root = document) {
  const checando = root.querySelector("[data-checando]");
  const form = root.querySelector('[data-form="redefinir"]');
  const invalido = root.querySelector("[data-invalido]");

  function erro(mensagem, campo) {
    const alvo = form.querySelector("[data-erro]");
    alvo.textContent = mensagem;
    alvo.hidden = false;
    alvo.classList.remove("is-bom");
    if (campo) campo.focus();
  }

  function recusar(motivo) {
    checando.hidden = true;
    form.hidden = true;
    invalido.hidden = false;
    invalido.querySelector("[data-motivo]").textContent = motivo;
  }

  function pedirSenha(email) {
    checando.hidden = true;
    invalido.hidden = true;
    form.hidden = false;
    form.querySelector("[data-para]").textContent = email
      ? `Você está redefinindo a senha de ${email}.`
      : "Escolha a senha que passará a valer a partir de agora.";
    form.senha.focus();
  }

  // Olhinho de mostrar/esconder senha, igual ao da tela de entrar.
  root.querySelectorAll("[data-ver-senha]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const campo = btn.previousElementSibling;
      const oculto = campo.type === "password";
      campo.type = oculto ? "text" : "password";
      btn.setAttribute("aria-label", oculto ? "Esconder senha" : "Mostrar senha");
      btn.classList.toggle("is-on", oculto);
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nova = form.senha.value;
    const repetida = form.repetir.value;

    if (!nova.trim()) return erro("Escreva a nova senha.", form.senha);
    if (nova.length < 6) return erro("A senha precisa de pelo menos 6 caracteres.", form.senha);

    // Conferir duas vezes importa mais aqui do que em qualquer outro campo: se
    // ele errar a digitação, sai desta tela sem saber a senha que acabou de
    // gravar, e o único caminho de volta é pedir outro link.
    if (nova !== repetida) return erro("As duas senhas não são iguais.", form.repetir);

    const botao = form.querySelector('[type="submit"]');
    botao.disabled = true;

    try {
      await db.definirSenha(nova);
      store.recarregar();
      location.href = auth.urlApp("dashboard");
    } catch (e) {
      botao.disabled = false;
      erro(e.message);
    }
  });

  (async () => {
    let volta;
    try {
      volta = await db.absorverRetornoDoEmail();
    } catch (e) {
      return recusar(e.message);
    }

    // Sem token no endereço: ou a pessoa abriu esta página direto, ou o link
    // já foi consumido numa aba anterior.
    if (!volta) {
      return recusar("Abra esta tela pelo link que chegou no seu e-mail.");
    }

    if (volta.tipo === "erro") return recusar(volta.mensagem);

    pedirSenha(volta.email);
  })();
}

if (!SPA) initRedefinir();
