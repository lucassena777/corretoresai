// Contas e sessão — agora no Supabase Auth, via REST puro (sem SDK, sem CDN).
//
// A API pública deste arquivo é a mesma de quando tudo vivia no localStorage:
// criarConta, entrar, sair, sessao, contaAtual, lerEstado, gravarEstado,
// gravarPerfil, trocarSenha, excluirConta. Nenhuma tela precisou mudar.
//
// O que vive onde, hoje:
//   Supabase  — a conta (e-mail e senha), o perfil do corretor e o plano.
//   navegador — os conteúdos, compromissos e configurações, por enquanto,
//               numa chave separada por usuário.
//
// É meio caminho de propósito: o login já é de verdade (recuperável, vale em
// qualquer aparelho e serve de base para a cobrança), enquanto o acervo ainda
// é local. Mover os conteúdos é o próximo passo.

const storage = (() => {
  const memoria = new Map();
  let usaMemoria = false;

  try {
    localStorage.setItem("corretoresai-teste", "1");
    localStorage.removeItem("corretoresai-teste");
  } catch {
    usaMemoria = true;
  }

  return {
    get persistente() { return !usaMemoria; },

    get(chave) {
      if (usaMemoria) return memoria.get(chave) ?? null;
      try { return localStorage.getItem(chave); }
      catch { usaMemoria = true; return memoria.get(chave) ?? null; }
    },

    set(chave, valor) {
      memoria.set(chave, valor);
      if (usaMemoria) return;
      try { localStorage.setItem(chave, valor); }
      catch { usaMemoria = true; }
    },

    remove(chave) {
      memoria.delete(chave);
      if (usaMemoria) return;
      try { localStorage.removeItem(chave); } catch { usaMemoria = true; }
    }
  };
})();

const db = (() => {
  const K_SESSAO = "corretoresai-sessao";
  const estadoDe = (uid) => `corretoresai-estado-${uid}`;

  function lerJson(chave, padrao) {
    try { return JSON.parse(storage.get(chave)) ?? padrao; } catch { return padrao; }
  }

  function gravarJson(chave, valor) {
    storage.set(chave, JSON.stringify(valor));
  }

  // A sessão fica em memória e no navegador: o store lê a conta de forma
  // síncrona, no carregamento da página, e não pode esperar a rede.
  let sessao = lerJson(K_SESSAO, null);

  const normalizar = (email) => String(email || "").trim().toLowerCase();

  /* ---------------- Conversa com o Supabase ---------------- */

  const endereco = (caminho) => `${CONFIG.supabaseUrl}${caminho}`;

  function cabecalhos(token) {
    return {
      "apikey": CONFIG.supabaseChave,
      "authorization": `Bearer ${token || CONFIG.supabaseChave}`,
      "content-type": "application/json"
    };
  }

  // Código do Supabase vira frase em português.
  const RECADOS = {
    invalid_credentials: "E-mail ou senha incorretos.",
    email_not_confirmed: "Confirme seu e-mail antes de entrar. A mensagem está na sua caixa de entrada.",
    email_exists: "Já existe uma conta com esse e-mail.",
    user_already_exists: "Já existe uma conta com esse e-mail.",
    weak_password: "A senha precisa de pelo menos 6 caracteres.",
    email_address_invalid: "Esse e-mail não parece válido.",
    over_email_send_rate_limit: "Muitas tentativas seguidas. Espere alguns minutos.",
    over_request_rate_limit: "Muitas tentativas seguidas. Espere alguns minutos.",
    same_password: "A nova senha precisa ser diferente da atual."
  };

  async function pedir(caminho, { metodo = "POST", corpo, token } = {}) {
    let resposta;
    try {
      resposta = await fetch(endereco(caminho), {
        method: metodo,
        headers: cabecalhos(token),
        body: corpo === undefined ? undefined : JSON.stringify(corpo)
      });
    } catch (e) {
      console.error("[CorretoresAI] falha ao falar com o Supabase:", e);
      throw new Error(CONFIG.emPreviaIsolada()
        ? "Esta prévia não faz chamadas externas — abra o site publicado para entrar."
        : "Não foi possível alcançar o servidor de contas. Verifique sua conexão.");
    }

    const texto = await resposta.text();
    let dados = null;
    try { dados = texto ? JSON.parse(texto) : null; } catch { /* resposta sem corpo */ }

    if (!resposta.ok) {
      const codigo = dados?.error_code || dados?.code || dados?.error;
      const bruto = dados?.msg || dados?.message || dados?.error_description || `Erro ${resposta.status}.`;
      console.error(`[CorretoresAI] Supabase ${resposta.status} em ${caminho}:`, bruto);
      throw new Error(RECADOS[codigo] || bruto);
    }

    return dados;
  }

  /* ---------------- Perfil ----------------
     O banco fala inglês e guarda o resto num jsonb; a aplicação fala
     português. A tradução mora aqui, nos dois sentidos. */

  function perfilDoBanco(linha, email) {
    const extras = linha?.preferences ?? {};
    return {
      ...PERFIL_PADRAO,
      nome: linha?.name || "",
      email: linha?.email || email || "",
      creci: linha?.creci || "",
      telefone: linha?.phone || "",
      cidade: linha?.city || PERFIL_PADRAO.cidade,
      imobiliaria: linha?.agency || "",
      bio: linha?.bio || "",
      instagram: extras.instagram || "",
      tom: extras.tom || PERFIL_PADRAO.tom,
      areas: Array.isArray(extras.areas) && extras.areas.length ? extras.areas : PERFIL_PADRAO.areas
    };
  }

  function perfilParaBanco(perfil) {
    return {
      name: perfil.nome,
      creci: perfil.creci,
      phone: perfil.telefone,
      city: perfil.cidade,
      agency: perfil.imobiliaria,
      bio: perfil.bio,
      preferences: { instagram: perfil.instagram, tom: perfil.tom, areas: perfil.areas }
    };
  }

  async function buscarPerfil(uid, token, email) {
    const linhas = await pedir(`/rest/v1/profiles?id=eq.${uid}&select=*`, { metodo: "GET", token });
    return {
      perfil: perfilDoBanco(linhas?.[0], email),
      plano: linhas?.[0]?.plano || "gratuito"
    };
  }

  async function abrirSessao(resposta) {
    const usuario = resposta.user;
    const token = resposta.access_token;

    let perfil = perfilDoBanco(null, usuario.email);
    let plano = "gratuito";
    try {
      const vindo = await buscarPerfil(usuario.id, token, usuario.email);
      perfil = vindo.perfil;
      plano = vindo.plano;
    } catch (e) {
      console.warn("[CorretoresAI] perfil ainda não disponível:", e.message);
    }

    sessao = {
      uid: usuario.id,
      email: usuario.email,
      token,
      refresh: resposta.refresh_token,
      expiraEm: Date.now() + (resposta.expires_in ?? 3600) * 1000,
      perfil,
      plano
    };
    gravarJson(K_SESSAO, sessao);
    return sessao;
  }

  // Renova quando o token está perto de vencer. Se a renovação falhar, a
  // sessão local continua valendo — ninguém é expulso do meio da tela por
  // causa de um token.
  async function renovarSePreciso() {
    if (!sessao?.refresh) return null;
    if (Date.now() < sessao.expiraEm - 60000) return sessao.token;

    try {
      const nova = await pedir("/auth/v1/token?grant_type=refresh_token", {
        corpo: { refresh_token: sessao.refresh }
      });
      sessao.token = nova.access_token;
      sessao.refresh = nova.refresh_token;
      sessao.expiraEm = Date.now() + (nova.expires_in ?? 3600) * 1000;
      gravarJson(K_SESSAO, sessao);
    } catch (e) {
      console.warn("[CorretoresAI] não deu para renovar a sessão:", e.message);
    }
    return sessao.token;
  }

  // Manda o que mudou para o banco sem segurar a tela. Falha aqui é aviso no
  // console, não erro na cara do corretor: o dado local já foi salvo.
  function sincronizarEmSegundoPlano(corpo) {
    if (!sessao) return;
    const uid = sessao.uid;
    renovarSePreciso().then((token) =>
      pedir(`/rest/v1/profiles?id=eq.${uid}`, { metodo: "PATCH", token, corpo })
    ).catch((e) => console.warn("[CorretoresAI] não sincronizou com o banco:", e.message));
  }

  return {
    CREDENCIAIS_DEMO: { email: "demo@corretoresai.app", senha: "demo1234" },

    async criarConta({ nome, email, senha, cidade = "", creci = "", telefone = "", imobiliaria = "" }) {
      const chave = normalizar(email);
      if (!chave || !nome?.trim()) throw new Error("Preencha nome e e-mail.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(chave)) throw new Error("E-mail inválido.");
      if ((senha || "").length < 6) throw new Error("A senha precisa de pelo menos 6 caracteres.");

      const resposta = await pedir("/auth/v1/signup", {
        corpo: {
          email: chave,
          password: senha,
          data: { nome: nome.trim(), cidade, creci, telefone, imobiliaria }
        }
      });

      // Com confirmação de e-mail ligada, o Supabase cria o usuário mas não
      // devolve sessão — quem chamou precisa saber que ainda falta confirmar.
      if (!resposta?.access_token) return { confirmarEmail: true, email: chave };

      await abrirSessao(resposta);
      return { confirmarEmail: false, email: chave };
    },

    async entrar(email, senha) {
      const resposta = await pedir("/auth/v1/token?grant_type=password", {
        corpo: { email: normalizar(email), password: senha }
      });
      return abrirSessao(resposta);
    },

    sair() {
      const token = sessao?.token;
      sessao = null;
      storage.remove(K_SESSAO);
      if (token) {
        fetch(endereco("/auth/v1/logout"), { method: "POST", headers: cabecalhos(token) })
          .catch(() => { /* a sessão local já foi embora */ });
      }
    },

    sessao() {
      return sessao?.uid ?? null;
    },

    contaAtual() {
      if (!sessao) return null;
      return {
        email: sessao.email,
        perfil: sessao.perfil,
        estado: lerJson(estadoDe(sessao.uid), null)
      };
    },

    existe() { return false; },
    quantasContas() { return sessao ? 1 : 0; },

    lerEstado() {
      return sessao ? lerJson(estadoDe(sessao.uid), null) : null;
    },

    gravarEstado(estado) {
      if (!sessao) return;
      gravarJson(estadoDe(sessao.uid), estado);

      // O plano NÃO é gravado daqui: o banco revoga UPDATE nessa coluna para
      // o usuário, e quem a altera é o webhook do pagamento. Ver planoDaConta.
    },

    // O plano que o banco conhece. Quem manda é a assinatura, não o navegador.
    planoDaConta() {
      return sessao?.plano ?? "gratuito";
    },

    // Token da sessão, para as funções que precisam saber quem está pedindo
    // (checkout do pagamento, cota da IA).
    tokenAtual() {
      return sessao?.token ?? null;
    },

    gravarPerfil(patch) {
      if (!sessao) return null;
      Object.assign(sessao.perfil, patch);
      gravarJson(K_SESSAO, sessao);
      sincronizarEmSegundoPlano(perfilParaBanco(sessao.perfil));
      return sessao.perfil;
    },

    // Relê perfil e plano do banco. Usado ao voltar do pagamento.
    async sincronizar() {
      if (!sessao) return null;
      const token = await renovarSePreciso();
      const vindo = await buscarPerfil(sessao.uid, token, sessao.email);
      sessao.perfil = vindo.perfil;
      sessao.plano = vindo.plano;
      gravarJson(K_SESSAO, sessao);
      return sessao;
    },

    async trocarSenha(atual, nova) {
      if (!sessao) throw new Error("Faça login novamente.");
      if ((nova || "").length < 6) throw new Error("A nova senha precisa de pelo menos 6 caracteres.");

      // O Supabase não confere a senha atual ao trocar: entrar de novo é a
      // forma honesta de exigir que ela seja digitada certo.
      try {
        await pedir("/auth/v1/token?grant_type=password", {
          corpo: { email: sessao.email, password: atual }
        });
      } catch {
        throw new Error("Senha atual incorreta.");
      }

      const token = await renovarSePreciso();
      await pedir("/auth/v1/user", { metodo: "PUT", token, corpo: { password: nova } });
    },

    async recuperarSenha(email) {
      await pedir("/auth/v1/recover", { corpo: { email: normalizar(email) } });
    },

    async excluirConta() {
      if (!sessao) return;
      const token = await renovarSePreciso();
      const uid = sessao.uid;
      try {
        await pedir("/rest/v1/rpc/excluir_minha_conta", { token, corpo: {} });
      } finally {
        storage.remove(estadoDe(uid));
        this.sair();
      }
    },

    // A conta de demonstração é uma conta real do Supabase, compartilhada.
    async garantirDemo() {
      return this.CREDENCIAIS_DEMO.email;
    }
  };
})();
