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

    consumirGeracao() {
      if (this.restantes() <= 0) return false;
      if (this.plano.cota !== Infinity) state.usadas += 1;
      persist();
      return true;
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

    trocarPlano(id) {
      if (!PLANOS[id] || id === state.plano) return;
      state.plano = id;
      state.usadas = 0;
      log("i-card", `Plano alterado para ${PLANOS[id].label}`);
      persist();
    },

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
