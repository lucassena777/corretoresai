// Banco de dados da aplicação.
//
// Hoje ele grava em localStorage, com uma conta por e-mail e os dados isolados
// por conta. A API abaixo (contas, sessão, ler/gravar) é a única porta de
// entrada — trocar por um back-end de verdade é reescrever só este arquivo.

const db = (() => {
  const K_CONTAS = "corretoresai-contas";
  const K_SESSAO = "corretoresai-sessao";

  function lerJson(chave, padrao) {
    try {
      const bruto = JSON.parse(localStorage.getItem(chave));
      return bruto ?? padrao;
    } catch {
      return padrao;
    }
  }

  function gravarJson(chave, valor) {
    localStorage.setItem(chave, JSON.stringify(valor));
  }

  const contas = () => lerJson(K_CONTAS, {});
  const normalizar = (email) => String(email || "").trim().toLowerCase();

  // Hash da senha. Em navegador com contexto seguro usa SHA-256 nativo;
  // em file:// o crypto.subtle não existe e cai num hash simples.
  // Nenhum dos dois substitui um back-end — isto é uma demonstração local.
  async function hash(senha, sal) {
    const texto = `${sal}::${senha}`;
    if (window.crypto?.subtle) {
      const bytes = new TextEncoder().encode(texto);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 2166136261;
    for (let i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `fallback${(h >>> 0).toString(16)}`;
  }

  function novoSal() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  return {
    async criarConta({ nome, email, senha, cidade = "", creci = "", telefone = "", imobiliaria = "" }) {
      const chave = normalizar(email);
      if (!chave || !nome?.trim()) throw new Error("Preencha nome e e-mail.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(chave)) throw new Error("E-mail inválido.");
      if ((senha || "").length < 6) throw new Error("A senha precisa de pelo menos 6 caracteres.");

      const todas = contas();
      if (todas[chave]) throw new Error("Já existe uma conta com esse e-mail.");

      const sal = novoSal();
      todas[chave] = {
        email: chave,
        senhaHash: await hash(senha, sal),
        sal,
        criadoEm: Date.now(),
        perfil: { ...PERFIL_PADRAO, nome: nome.trim(), email: chave, cidade: cidade || PERFIL_PADRAO.cidade, creci, telefone, imobiliaria },
        estado: null // preenchido pelo store no primeiro acesso
      };

      gravarJson(K_CONTAS, todas);
      localStorage.setItem(K_SESSAO, chave);
      return todas[chave];
    },

    async entrar(email, senha) {
      const chave = normalizar(email);
      const conta = contas()[chave];
      if (!conta) throw new Error("Não encontramos uma conta com esse e-mail.");
      const tentativa = await hash(senha, conta.sal);
      if (tentativa !== conta.senhaHash) throw new Error("Senha incorreta.");
      localStorage.setItem(K_SESSAO, chave);
      return conta;
    },

    sair() {
      localStorage.removeItem(K_SESSAO);
    },

    sessao() {
      const chave = localStorage.getItem(K_SESSAO);
      return chave && contas()[chave] ? chave : null;
    },

    contaAtual() {
      const chave = this.sessao();
      return chave ? contas()[chave] : null;
    },

    existe(email) {
      return Boolean(contas()[normalizar(email)]);
    },

    quantasContas() {
      return Object.keys(contas()).length;
    },

    // Estado da conta logada (conteúdos, plano, histórico, configurações).
    lerEstado() {
      const conta = this.contaAtual();
      return conta ? conta.estado : null;
    },

    gravarEstado(estado) {
      const chave = this.sessao();
      if (!chave) return;
      const todas = contas();
      todas[chave].estado = estado;
      gravarJson(K_CONTAS, todas);
    },

    gravarPerfil(patch) {
      const chave = this.sessao();
      if (!chave) return null;
      const todas = contas();
      Object.assign(todas[chave].perfil, patch);
      gravarJson(K_CONTAS, todas);
      return todas[chave].perfil;
    },

    async trocarSenha(atual, nova) {
      const chave = this.sessao();
      const todas = contas();
      const conta = todas[chave];
      if (!conta) throw new Error("Faça login novamente.");
      if ((await hash(atual, conta.sal)) !== conta.senhaHash) throw new Error("Senha atual incorreta.");
      if ((nova || "").length < 6) throw new Error("A nova senha precisa de pelo menos 6 caracteres.");
      conta.sal = novoSal();
      conta.senhaHash = await hash(nova, conta.sal);
      gravarJson(K_CONTAS, todas);
    },

    excluirConta() {
      const chave = this.sessao();
      if (!chave) return;
      const todas = contas();
      delete todas[chave];
      gravarJson(K_CONTAS, todas);
      this.sair();
    },

    // Conta de demonstração, criada uma única vez, já com o acervo de exemplo.
    async garantirDemo() {
      const chave = "marina@corretoresai.com.br";
      if (contas()[chave]) return chave;

      const sessaoAnterior = localStorage.getItem(K_SESSAO);
      await this.criarConta({
        nome: "Marina Duarte",
        email: chave,
        senha: "demo1234",
        cidade: "Campinas",
        creci: "CRECI-SP 214.885",
        telefone: "(11) 98877-1200",
        imobiliaria: "Duarte Imóveis"
      });

      const todas = contas();
      todas[chave].demo = true;
      todas[chave].perfil.bio = "Especialista em apartamentos e lançamentos na região central. Atendimento consultivo do primeiro contato à escritura.";
      todas[chave].estado = estadoSemente({ plano: "ilimitado", comAcervo: true });
      gravarJson(K_CONTAS, todas);

      if (sessaoAnterior) localStorage.setItem(K_SESSAO, sessaoAnterior);
      else localStorage.removeItem(K_SESSAO);

      return chave;
    },

    CREDENCIAIS_DEMO: { email: "marina@corretoresai.com.br", senha: "demo1234" }
  };
})();
