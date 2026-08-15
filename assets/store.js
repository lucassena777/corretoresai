// Estado único da aplicação: conteúdos, perfil, plano e histórico.
// Tudo persiste em localStorage e qualquer tela pode ouvir mudanças.

const store = (() => {
  const KEY = "corretoresai-estado-v2";
  const listeners = new Set();

  function seedState() {
    return {
      itens: SEED_ITENS.map((item) => ({ ...item, tags: [...item.tags] })),
      perfil: { ...PERFIL_PADRAO, areas: [...PERFIL_PADRAO.areas] },
      plano: "ilimitado",
      usadas: 0,
      atividades: SEED_ATIVIDADES.map((a) => ({
        icon: a.icon,
        text: a.text,
        at: HOJE.getTime() - a.dias * 86400000
      }))
    };
  }

  let state = load();

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (!saved || !Array.isArray(saved.itens)) return seedState();
      return { ...seedState(), ...saved };
    } catch {
      return seedState();
    }
  }

  function persist() {
    localStorage.setItem(KEY, JSON.stringify(state));
    listeners.forEach((fn) => fn(state));
  }

  function log(icon, text) {
    state.atividades.unshift({ icon, text, at: Date.now() });
    state.atividades = state.atividades.slice(0, 40);
  }

  function nextId() {
    return `n${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  }

  return {
    get state() { return state; },
    get itens() { return state.itens; },
    get perfil() { return state.perfil; },
    get plano() { return PLANOS[state.plano]; },
    get planoId() { return state.plano; },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    // Usado pelo roteador do arquivo único ao trocar de tela.
    dropSubscribers() {
      listeners.clear();
    },

    find(id) {
      return state.itens.find((item) => item.id === id);
    },

    // Só o que aparece no Kanban / calendário.
    board() {
      return state.itens.filter((item) => KANBAN.includes(item.status));
    },

    restantes() {
      const cota = PLANOS[state.plano].cota;
      return cota === Infinity ? Infinity : Math.max(0, cota - state.usadas);
    },

    consumirGeracao() {
      if (this.restantes() <= 0) return false;
      if (PLANOS[state.plano].cota !== Infinity) state.usadas += 1;
      persist();
      return true;
    },

    criar(dados) {
      const item = {
        id: nextId(),
        status: "rascunho",
        time: "10:00",
        tags: [],
        ...dados
      };
      item.script = item.script || buildScript(item, state.perfil);
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

    // Move sem gerar log de edição genérico (usado no arrastar-e-soltar).
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
      Object.assign(state.perfil, patch);
      log("i-user", "Perfil atualizado");
      persist();
    },

    trocarPlano(id) {
      if (!PLANOS[id]) return;
      state.plano = id;
      log("i-card", `Plano alterado para ${PLANOS[id].label}`);
      persist();
    },

    roteiro(item) {
      if (!item.script) {
        item.script = buildScript(item, state.perfil);
        persist();
      }
      return item.script;
    },

    reset() {
      localStorage.removeItem(KEY);
      state = seedState();
      persist();
    }
  };
})();
