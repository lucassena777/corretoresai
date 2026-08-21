// Estado da conta logada. Lê e grava sempre através do db, nunca direto no
// localStorage — assim trocar o banco por um back-end não mexe nas telas.

const store = (() => {
  const listeners = new Set();
  let state = null;

  function carregar() {
    const conta = db.contaAtual();
    if (!conta) { state = null; return; }
    if (!conta.estado) {
      conta.estado = estadoSemente({ plano: "gratuito" });
      db.gravarEstado(conta.estado);
    }
    state = { ...estadoSemente(), ...conta.estado, config: { ...CONFIG_PADRAO, ...(conta.estado.config || {}) } };

    // O plano vem do banco, não do navegador: quem manda é a assinatura paga.
    // Sem isto, apagar uma chave do localStorage viraria upgrade de graça.
    state.plano = db.planoDaConta();

    // O mesmo vale para as gerações já gastas. Elas são contadas no servidor;
    // o número guardado aqui é só o que a tela mostra enquanto ninguém
    // pergunta. Ao entrar, o do banco prevalece — inclusive quando o corretor
    // gerou de outro aparelho.
    const doBanco = db.cotaUsadaDaConta();
    if (doBanco !== null) state.usadas = doBanco;
  }

  carregar();

  function persist() {
    db.gravarEstado(state);
    listeners.forEach((fn) => fn(state));
  }

  function log(icon, text) {
    state.atividades.unshift({ icon, text, at: Date.now() });
    state.atividades = state.atividades.slice(0, 120);
  }

  function nextId() {
    return `n${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  }

  return {
    get logado() { return Boolean(state); },
    get state() { return state; },
    get itens() { return state?.itens ?? []; },
    get atividades() { return state?.atividades ?? []; },
    get compromissos() { return state?.compromissos ?? []; },
    get config() { return state?.config ?? { ...CONFIG_PADRAO }; },
    get perfil() { return db.contaAtual()?.perfil ?? { ...PERFIL_PADRAO }; },
    get plano() { return PLANOS[state?.plano] ?? PLANOS.gratuito; },
    get planoId() { return state?.plano ?? "gratuito"; },

    recarregar() { carregar(); listeners.forEach((fn) => fn(state)); },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    dropSubscribers() { listeners.clear(); },

    find(id) { return state.itens.find((item) => item.id === id); },

    board() { return state.itens.filter((item) => KANBAN.includes(item.status)); },

    restantes() {
      const cota = this.plano.cota;
      return cota === Infinity ? Infinity : Math.max(0, cota - state.usadas);
    },

    // Só uma leitura: evita gastar uma requisição que o servidor já vai
    // recusar. Quem decide de verdade é o servidor.
    podeGerar() {
      return this.restantes() > 0;
    },

    // A contagem que vale é a do servidor. Ele cobra depois que a geração deu
    // certo, e é ele que recusa quando acaba.
    //
    // Antes o número era incrementado aqui, ANTES da chamada. Toda falha de
    // rede, timeout ou erro do modelo queimava uma geração que o servidor
    // nunca cobrou: o corretor perdia cota por defeito nosso, e os dois
    // contadores iam se afastando um do outro sem nada reconciliá-los.
    sincronizarCota(usadas) {
      if (typeof usadas !== "number" || !Number.isFinite(usadas) || usadas < 0) return;
      state.usadas = usadas;
      persist();
    },

    criar(dados) {
      const item = {
        id: nextId(),
        status: "rascunho",
        time: state.config.horarioPadrao,
        tags: [],
        ...dados
      };
      item.script = item.script || buildScript(item, this.perfil);
      state.itens.unshift(item);
      log("i-sparkle", `"${item.title}" foi criado`);
      persist();
      return item;
    },

    atualizar(id, patch) {
      const item = this.find(id);
      if (!item) return null;

      const antesStatus = item.status;
      const antesData = item.date;
      Object.assign(item, patch);

      if (patch.status && patch.status !== antesStatus) {
        log("i-kanban", `"${item.title}" foi movido para ${STATUSES[patch.status].label}`);
      } else if (patch.date && patch.date !== antesData) {
        log("i-calendar", `"${item.title}" mudou de data`);
      } else {
        log("i-wand", `"${item.title}" foi editado`);
      }

      persist();
      return item;
    },

    mover(id, patch) {
      const item = this.find(id);
      if (!item) return null;

      if (patch.status && patch.status !== item.status) {
        item.status = patch.status;
        log("i-kanban", `"${item.title}" foi movido para ${STATUSES[patch.status].label}`);
      }
      if (patch.date && patch.date !== item.date) {
        item.date = patch.date;
        log("i-calendar", `"${item.title}" mudou de data`);
      }

      persist();
      return item;
    },

    duplicar(id) {
      const original = this.find(id);
      if (!original) return null;
      const copia = {
        ...structuredClone(original),
        id: nextId(),
        title: `${original.title} (cópia)`,
        status: "rascunho"
      };
      state.itens.unshift(copia);
      log("i-copy", `"${original.title}" foi duplicado`);
      persist();
      return copia;
    },

    remover(id) {
      const item = this.find(id);
      if (!item) return;
      state.itens = state.itens.filter((i) => i.id !== id);
      log("i-trash", `"${item.title}" foi excluído`);
      persist();
    },

    /* ---- Compromissos ----
       Agenda pessoal do corretor: visita, reunião, assinatura. Vive fora de
       `itens` porque não é conteúdo — não entra na Biblioteca, no Kanban nem
       nas métricas de publicação. */

    acharCompromisso(id) { return state.compromissos.find((c) => c.id === id); },


    criarCompromisso(dados) {
      const compromisso = {
        id: nextId(),
        tipo: COMPROMISSO_PADRAO,
        time: state.config.horarioPadrao,
        local: "",
        notas: "",
        ...dados
      };
      state.compromissos.push(compromisso);
      log("i-calendar-clock", `Compromisso "${compromisso.title}" foi marcado`);
      persist();
      return compromisso;
    },

    atualizarCompromisso(id, patch) {
      const compromisso = this.acharCompromisso(id);
      if (!compromisso) return null;

      const antes = compromisso.date;
      Object.assign(compromisso, patch);

      log("i-calendar-clock", patch.date && patch.date !== antes
        ? `Compromisso "${compromisso.title}" mudou de data`
        : `Compromisso "${compromisso.title}" foi editado`);

      persist();
      return compromisso;
    },

    removerCompromisso(id) {
      const compromisso = this.acharCompromisso(id);
      if (!compromisso) return;
      state.compromissos = state.compromissos.filter((c) => c.id !== id);
      log("i-trash", `Compromisso "${compromisso.title}" foi cancelado`);
      persist();
    },

    salvarPerfil(patch) {
      db.gravarPerfil(patch);
      log("i-user", "Perfil atualizado");
      persist();
    },

    salvarConfig(patch) {
      Object.assign(state.config, patch);
      log("i-settings", "Configurações atualizadas");
      persist();
    },

    // Não existe mais um "trocar plano" pelo navegador. O plano mora numa
    // coluna que só o webhook do pagamento pode escrever, e a tela lê de lá.
    // Quem quiser mudar de plano passa pelo Stripe — ver assets/planos.js.

    roteiro(item) {
      if (!item.script) {
        item.script = buildScript(item, this.perfil);
        persist();
      }
      return item.script;
    },

    // Coloca (ou tira) o acervo de exemplo na conta atual.
    carregarExemplos() {
      const semente = estadoSemente({ plano: state.plano, comAcervo: true });
      state.itens = semente.itens;
      state.atividades = semente.atividades;
      log("i-book", "Acervo de exemplo carregado");
      persist();
    },

    limparTudo() {
      state.itens = [];
      state.atividades = [];
      state.usadas = 0;
      persist();
    }
  };
})();
