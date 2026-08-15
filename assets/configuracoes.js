// Configurações: cada controle grava na hora e vale para o resto do app.

function initConfiguracoes(root = document) {
  if (!auth.exigirLogin()) return;

  const painel = root.querySelector("[data-config]");
  const selectTema = root.querySelector("[data-tema]");

  const HORARIOS = ["07:00", "09:00", "10:00", "12:00", "13:00", "15:00",
    "17:00", "18:00", "19:00", "20:00", "21:00"];

  const preencher = (nome, valores) => {
    painel.querySelector(`[name="${nome}"]`).innerHTML =
      valores.map((v) => `<option value="${v}">${v}</option>`).join("");
  };

  preencher("areaPadrao", AREAS);
  preencher("funilPadrao", FUNIS);
  preencher("formatoPadrao", FORMATOS);
  preencher("horarioPadrao", HORARIOS);

  function carregar() {
    const c = store.config;
    painel.querySelectorAll("select[name], input[name]").forEach((campo) => {
      if (campo.type === "checkbox") campo.checked = Boolean(c[campo.name]);
      else campo.value = String(c[campo.name]);
    });
    selectTema.value = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    root.querySelector("[data-conta-email]").textContent = db.contaAtual()?.email ?? "";
  }

  painel.addEventListener("change", (event) => {
    const campo = event.target.closest("select[name], input[name]");
    if (!campo) return;

    const valor = campo.type === "checkbox"
      ? campo.checked
      : (campo.name === "semanaComeca" ? Number(campo.value) : campo.value);

    store.salvarConfig({ [campo.name]: valor });
    ui.toast("Configuração salva.");
  });

  selectTema.addEventListener("change", () => {
    document.documentElement.dataset.theme = selectTema.value;
    localStorage.setItem("corretoresai-theme", selectTema.value);
    ui.toast(selectTema.value === "light" ? "Tema claro ativado." : "Tema escuro ativado.");
  });

  // O botão de sol na topbar também mexe no tema: mantém o select em dia.
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-theme-toggle]")) {
      setTimeout(() => { selectTema.value = document.documentElement.dataset.theme; }, 0);
    }
  });

  // ---- Conta ------------------------------------------------------------

  root.querySelector("[data-senha]").addEventListener("click", () => {
    ui.openModal(`
      <header class="modal-head">
        <div><h2>Trocar senha</h2></div>
        <button class="theme-btn" type="button" data-close aria-label="Fechar"><svg><use href="#i-close" /></svg></button>
      </header>
      <form class="modal-body" data-form-senha>
        <div class="field">
          <label for="s-atual">Senha atual</label>
          <input id="s-atual" name="atual" type="password" required />
        </div>
        <div class="field">
          <label for="s-nova">Nova senha</label>
          <input id="s-nova" name="nova" type="password" placeholder="Mínimo de 6 caracteres" required />
        </div>
        <p class="auth-erro" data-erro hidden></p>
      </form>
      <footer class="modal-foot">
        <button class="btn btn-outline" type="button" data-close>Cancelar</button>
        <button class="btn btn-primary" type="button" data-salvar-senha>Salvar nova senha</button>
      </footer>`, (modal) => {
      modal.querySelector("[data-salvar-senha]").addEventListener("click", async () => {
        const form = modal.querySelector("[data-form-senha]");
        const erro = modal.querySelector("[data-erro]");
        try {
          await db.trocarSenha(form.atual.value, form.nova.value);
          ui.closeModal();
          ui.toast("Senha atualizada.");
        } catch (e) {
          erro.textContent = e.message;
          erro.hidden = false;
        }
      });
    });
  });

  root.querySelector("[data-exemplos]").addEventListener("click", () => {
    if (!confirm("Carregar os conteúdos de exemplo? Isso substitui o que já existe na conta.")) return;
    store.carregarExemplos();
    ui.toast("Acervo de exemplo carregado.");
  });

  root.querySelector("[data-limpar-conteudo]").addEventListener("click", () => {
    if (!confirm("Apagar todo o conteúdo desta conta? Não dá para desfazer.")) return;
    store.limparTudo();
    ui.toast("Conteúdo apagado.");
  });

  root.querySelector("[data-excluir-conta]").addEventListener("click", () => {
    if (!confirm("Excluir sua conta e todos os dados dela? Não dá para desfazer.")) return;
    db.excluirConta();
    location.href = auth.urlEntrar();
  });

  store.subscribe(carregar);
  carregar();
}

if (!SPA) initConfiguracoes();
