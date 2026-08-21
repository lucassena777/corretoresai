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
    email_not_confirmed: "Sua conta existe, mas o e-mail ainda não foi confirmado. Clique em \"Reenviar confirmação\" abaixo.",
    email_exists: "Já existe uma conta com esse e-mail.",
    user_already_exists: "Já existe uma conta com esse e-mail.",
    weak_password: "A senha precisa de pelo menos 6 caracteres.",
    email_address_invalid: "Esse e-mail não parece válido.",
    over_email_send_rate_limit: "Muitas tentativas seguidas. Espere alguns minutos.",
    over_request_rate_limit: "Muitas tentativas seguidas. Espere alguns minutos.",
    same_password: "A nova senha precisa ser diferente da atual."
  };

  // Erros que chegam no endereço, na volta de um link de e-mail. Vêm com nome
  // diferente dos de cima porque não são resposta de requisição: o Supabase os
  // devolve como parâmetro na URL.
  const RECADOS_DO_LINK = {
    otp_expired: "Esse link já expirou. Peça um novo abaixo — os links valem por pouco tempo, de propósito.",
    access_denied: "Esse link não vale mais. Ou já foi usado, ou expirou. Peça um novo abaixo.",
    server_error: "O servidor de contas recusou o link. Tente pedir outro."
  };

  async function pedir(caminho, { metodo = "POST", corpo, token, prefer, keepalive } = {}) {
    let resposta;
    try {
      resposta = await fetch(endereco(caminho), {
        method: metodo,
        headers: { ...cabecalhos(token), ...(prefer ? { prefer } : {}) },
        keepalive,
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
      plano: linhas?.[0]?.plano || "gratuito",
      cotaUsada: typeof linhas?.[0]?.cota_usada === "number" ? linhas[0].cota_usada : null
    };
  }

  async function abrirSessao(resposta) {
    const usuario = resposta.user;
    const token = resposta.access_token;

    let perfil = perfilDoBanco(null, usuario.email);
    let plano = "gratuito";
    let cotaUsada = null;
    try {
      const vindo = await buscarPerfil(usuario.id, token, usuario.email);
      perfil = vindo.perfil;
      plano = vindo.plano;
      cotaUsada = vindo.cotaUsada;
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
      plano,
      cotaUsada
    };
    gravarJson(K_SESSAO, sessao);

    // Puxa o acervo antes de devolver o controle: é isso que faz o corretor
    // encontrar os conteúdos dele ao entrar de outro aparelho. Se a rede
    // falhar aqui, fica o que já houver neste navegador — melhor abrir com o
    // acervo local do que não abrir.
    try {
      const linhas = await pedir(`/rest/v1/estado_conta?user_id=eq.${usuario.id}&select=estado`, {
        metodo: "GET", token
      });
      const doBanco = linhas?.[0]?.estado;
      if (doBanco && Object.keys(doBanco).length) gravarJson(estadoDe(usuario.id), doBanco);
    } catch (e) {
      console.warn("[CorretoresAI] acervo não baixou:", e.message);
    }

    return sessao;
  }

  /* ---------------- Volta dos links de e-mail ----------------

     Aqui estava o buraco que quebrava confirmação de conta e "esqueci minha
     senha" ao mesmo tempo.

     O Supabase confirma o e-mail no servidor dele e então devolve o navegador
     para o site com a sessão no FRAGMENTO do endereço:

       https://corretoresai.com.br/app/entrar.html#access_token=...&type=signup

     Fragmento nunca é enviado a servidor nenhum — só o JavaScript da página
     consegue ler. Como nada nesta biblioteca lia, acontecia o seguinte: o
     corretor clicava no link, o token de uso único era gasto, a conta ficava
     de fato confirmada, e ele caía numa tela de login sem nenhum sinal de que
     algo tinha acontecido. Achando que falhou, clicava no link de novo — e aí
     vinha "Email link is invalid or has expired", porque o token já tinha
     sido usado na primeira vez.

     Com "esqueci minha senha" era pior: o link de recuperação nunca teve tela
     para onde ir, então era impossível concluir. */

  async function lerUsuario(token) {
    return pedir("/auth/v1/user", { metodo: "GET", token });
  }

  // Tira o token da barra de endereço assim que ele é consumido. Não é
  // enfeite: sem isso a credencial fica no histórico do navegador e viaja em
  // qualquer link que o corretor copie e mande para alguém.
  function limparEndereco() {
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch { /* navegador antigo: o token some no próximo passo mesmo */ }
  }

  // Para onde o Supabase deve mandar o corretor depois de validar o link.
  // Calculado a partir da página atual em vez de fixado: assim o endereço
  // acompanha o domínio sem ninguém precisar lembrar de trocar.
  function destinoDoEmail(pagina) {
    try {
      return new URL(pagina, location.href).href.split("#")[0];
    } catch {
      return "";
    }
  }

  function comDestino(caminho, pagina) {
    const destino = destinoDoEmail(pagina);
    return destino ? `${caminho}?redirect_to=${encodeURIComponent(destino)}` : caminho;
  }

  async function absorverRetornoDoEmail() {
    if (typeof location === "undefined") return null;

    const cru = location.hash.startsWith("#") ? location.hash.slice(1) : "";
    if (!cru) return null;

    const p = new URLSearchParams(cru);
    const acesso = p.get("access_token");
    const erro = p.get("error_description") || p.get("error");

    // Um "#/calendario" da navegação interna também cai aqui. Se não houver
    // token nem erro, não é volta de e-mail: sai sem tocar no endereço.
    if (!acesso && !erro) return null;

    limparEndereco();

    if (erro) {
      const codigo = p.get("error_code") || p.get("error");
      return { tipo: "erro", mensagem: RECADOS_DO_LINK[codigo] || decodeURIComponent(erro.replace(/\+/g, " ")) };
    }

    const tipo = p.get("type") || "signup";

    try {
      const usuario = await lerUsuario(acesso);
      await abrirSessao({
        access_token: acesso,
        refresh_token: p.get("refresh_token") || "",
        expires_in: Number(p.get("expires_in")) || 3600,
        user: usuario
      });
      return { tipo, email: usuario.email };
    } catch (e) {
      return { tipo: "erro", mensagem: `O link foi aceito, mas a sessão não abriu: ${e.message}` };
    }
  }

  // Gravação no banco com respiro: arrastar um card no calendário dispara
  // várias mudanças seguidas, e cada uma não precisa virar uma requisição.
  let timerAcervo = null;
  let acervoPendente = null;

  function agendarEnvioDoAcervo(estado) {
    acervoPendente = estado;
    clearTimeout(timerAcervo);
    timerAcervo = setTimeout(enviarAcervo, 1200);
  }

  async function enviarAcervo() {
    if (!sessao || !acervoPendente) return;
    const estado = acervoPendente;
    acervoPendente = null;

    try {
      const token = await renovarSePreciso();
      await pedir("/rest/v1/estado_conta", {
        metodo: "POST",
        token,
        corpo: { user_id: sessao.uid, estado, atualizado_em: new Date().toISOString() },
        prefer: "resolution=merge-duplicates,return=minimal",
        keepalive: true
      });
    } catch (e) {
      console.warn("[CorretoresAI] acervo não sincronizado:", e.message);
    }
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

  // Trocar de aba, minimizar ou fechar: manda o que estiver pendente antes que
  // a página suma. `visibilitychange` é o gancho confiável para isso — o
  // `beforeunload` costuma ser cortado no meio no celular.
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && acervoPendente) {
        clearTimeout(timerAcervo);
        enviarAcervo();
      }
    });
  }

  return {
    CREDENCIAIS_DEMO: { email: "demo@corretoresai.app", senha: "demo1234" },

    async criarConta({ nome, email, senha, cidade = "", creci = "", telefone = "", imobiliaria = "" }) {
      const chave = normalizar(email);
      if (!chave || !nome?.trim()) throw new Error("Preencha nome e e-mail.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(chave)) throw new Error("E-mail inválido.");
      if ((senha || "").length < 6) throw new Error("A senha precisa de pelo menos 6 caracteres.");

      // O redirect_to diz ao Supabase para onde devolver o corretor depois de
      // validar o link. Sem ele, o destino é a Site URL do projeto — que fica
      // desatualizada toda vez que o endereço do site muda.
      const resposta = await pedir(comDestino("/auth/v1/signup", "entrar.html"), {
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
      // Sai com o que estava pendente já a caminho do banco.
      clearTimeout(timerAcervo);
      if (acervoPendente) enviarAcervo();

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

      // Grava local primeiro: a tela não espera a rede para responder.
      gravarJson(estadoDe(sessao.uid), estado);
      agendarEnvioDoAcervo(estado);

      // O plano NÃO é gravado daqui: o banco revoga UPDATE nessa coluna para
      // o usuário, e quem a altera é o webhook do pagamento. Ver planoDaConta.
    },

    // Força o envio pendente. Usado ao sair, para não perder o último clique.
    async salvarAgora() {
      clearTimeout(timerAcervo);
      await enviarAcervo();
    },

    // O plano que o banco conhece. Quem manda é a assinatura, não o navegador.
    planoDaConta() {
      return sessao?.plano ?? "gratuito";
    },

    // Quantas gerações o banco já contou neste ciclo. Devolve null quando não
    // se sabe — aí a tela fica com o número que já tinha em vez de fingir zero,
    // que anunciaria cota cheia para quem não tem.
    cotaUsadaDaConta() {
      return typeof sessao?.cotaUsada === "number" ? sessao.cotaUsada : null;
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
      sessao.cotaUsada = vindo.cotaUsada;
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

    // O link de recuperação vai para a tela de nova senha, não para o login:
    // é lá que existe o formulário que conclui a troca.
    async recuperarSenha(email) {
      await pedir(comDestino("/auth/v1/recover", "redefinir.html"), {
        corpo: { email: normalizar(email) }
      });
    },

    async reenviarConfirmacao(email) {
      await pedir(comDestino("/auth/v1/resend", "entrar.html"), {
        corpo: { type: "signup", email: normalizar(email) }
      });
    },

    // Troca de senha vinda do link de recuperação. Diferente de trocarSenha:
    // aqui não se pede a senha atual, porque quem chegou até aqui provou ter
    // acesso à caixa de entrada — que é justamente a prova de quem esqueceu a
    // senha consegue dar.
    async definirSenha(nova) {
      if (!sessao) throw new Error("A sessão do link expirou. Peça um novo link de nova senha.");
      if ((nova || "").length < 6) throw new Error("A nova senha precisa de pelo menos 6 caracteres.");

      const token = await renovarSePreciso();
      await pedir("/auth/v1/user", { metodo: "PUT", token, corpo: { password: nova } });
    },

    // Lê a volta de um link de e-mail. Devolve null quando não há nada a ler,
    // { tipo: "signup" | "recovery", email } quando a sessão abriu, ou
    // { tipo: "erro", mensagem } quando o link não vale mais.
    absorverRetornoDoEmail,

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
