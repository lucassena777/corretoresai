// Sementes e constantes da demonstração.
// O estado vivo (o que o usuário cria, edita, arrasta e apaga) fica em store.js.

// true apenas no build de arquivo único (dist/preview.html), que roteia por hash.
const SPA = typeof PREVIEW_SPA !== "undefined" && PREVIEW_SPA;

const HOJE = new Date(2026, 7, 15); // 15 de agosto de 2026

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez"];

// Índice = Date.getDay(). Usado para dizer à IA que dia da semana é hoje.
const DIAS_SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira",
  "quinta-feira", "sexta-feira", "sábado"];

const AREAS = ["Apartamentos", "Casas", "Studios", "Terrenos", "Condomínios",
  "Lançamentos", "Comercial", "Alto padrão", "Rural"];

const FORMATOS = ["Reels", "Carrossel", "Stories", "TikTok"];

const FUNIS = ["Topo", "Meio", "Fundo", "Personalizado"];

const STATUSES = {
  rascunho: { label: "Rascunho", hint: "Ainda sem data confirmada", color: "var(--text-dim)" },
  aprovado: { label: "Aprovado", hint: "Pronto para produzir", color: "var(--warn)" },
  agendado: { label: "Agendado", hint: "Com data confirmada", color: "var(--info)" },
  publicado: { label: "Publicado", hint: "Já está no ar", color: "var(--ok)" }
};

// Colunas que aparecem no Kanban, nesta ordem.
const KANBAN = ["aprovado", "agendado", "publicado"];


/* ---------------- Compromissos ----------------
   A agenda do corretor não é só conteúdo: visita, reunião e assinatura moram
   no mesmo calendário. Compromisso é coisa separada de conteúdo de propósito —
   não tem roteiro, funil nem Kanban, e misturar os dois sujaria a Biblioteca
   e as métricas. */

const TIPOS_COMPROMISSO = {
  visita:     { label: "Visita",     icon: "i-eye",            color: "#5aa9e6" },
  reuniao:    { label: "Reunião",    icon: "i-user",           color: "#c9a227" },
  proposta:   { label: "Proposta",   icon: "i-check-circle",   color: "#6fbf73" },
  assinatura: { label: "Assinatura", icon: "i-book",           color: "#b98cd6" },
  captacao:   { label: "Captação",   icon: "i-building",       color: "#e0955c" },
  pessoal:    { label: "Pessoal",    icon: "i-calendar-clock", color: "#9aa1a8" }
};

const COMPROMISSO_PADRAO = "visita";

const PLANOS = {
  gratuito: {
    id: "gratuito", label: "Gratuito", cota: 5, preco: "R$ 0", icone: "i-sparkle",
    resumo: "Para conhecer a plataforma e publicar as primeiras semanas sem pagar nada.",
    beneficios: [
      "5 gerações de conteúdo com IA por mês",
      "Acesso completo ao Calendário e ao Kanban",
      "Roteiro com os 11 campos, pronto para gravar",
      "Biblioteca com busca e filtros",
      "Exportação do texto para copiar e colar"
    ],
    cta: "Começar Grátis"
  },
  pro: {
    id: "pro", label: "Corretor Pro", cota: 40, preco: "R$ 39,90", icone: "i-rocket",
    resumo: "Para quem já publica toda semana e quer o mês inteiro planejado de uma vez.",
    beneficios: [
      "40 gerações de conteúdo com IA por mês",
      "Escolha da etapa do funil: topo, meio e fundo",
      "Roteiros estruturados para Reels, TikTok, Stories e Carrossel",
      "Gerador de Carrosséis e de anúncios de Tráfego Pago",
      "Funil personalizado para campanhas e lançamentos",
      "Histórico completo de cada alteração",
      "Suporte prioritário via WhatsApp"
    ],
    cta: "Quero Acelerar Minhas Vendas"
  },
  ilimitado: {
    id: "ilimitado", label: "Ilimitado", cota: Infinity, preco: "R$ 59,90", icone: "i-crown",
    resumo: "Para equipes e imobiliárias que produzem todo dia e não podem esbarrar em cota.",
    beneficios: [
      "Gerações de conteúdo 100% ilimitadas",
      "Tudo do Corretor Pro, sem teto mensal",
      "Legenda gerada a partir do link ou da foto do imóvel",
      "Exportação e agendamento em 1 clique",
      "Vários corretores na mesma conta",
      "Acesso antecipado a novas ferramentas",
      "Suporte VIP individual"
    ],
    cta: "Desbloquear Acesso Ilimitado"
  }
};

const PERFIL_PADRAO = {
  nome: "",
  email: "",
  creci: "",
  telefone: "",
  cidade: "Campinas",
  imobiliaria: "",
  instagram: "",
  bio: "",
  tom: "Direta, sem jargão de imobiliária e sempre explicando o custo real de morar no imóvel.",
  areas: ["Apartamentos"]
};

const CONFIG_PADRAO = {
  areaPadrao: "Apartamentos",
  funilPadrao: "Topo",
  formatoPadrao: "Reels",
  horarioPadrao: "19:00",
  semanaComeca: 0,          // 0 = domingo, 1 = segunda
  agendarAoAprovar: true,
  reduzirAnimacoes: false,
  resumoSemanal: true,
  lembretes: false
};

const SEED_ITENS = [
  { id: "c1", title: "3 perguntas para fazer antes de fechar um imóvel comercial",
    area: "Comercial", format: "Reels", funnel: "Meio", status: "aprovado",
    date: "2026-07-24", time: "17:00", tags: ["Comercial", "Renda", "Reels"] },

  { id: "c2", title: "Pronto ou na planta: o comparativo honesto para casas",
    area: "Casas", format: "TikTok", funnel: "Meio", status: "aprovado",
    date: "2026-07-31", time: "20:30", tags: ["Casas", "Família", "TikTok"] },

  { id: "c3", title: "Laje corporativa com piso elevado e ar central — agende sua visita",
    area: "Comercial", format: "Carrossel", funnel: "Fundo", status: "aprovado",
    date: "2026-08-07", time: "11:00", tags: ["Comercial", "Visita", "Carrossel"] },

  { id: "c4", title: "Disponível agora: 2 dormitórios com suíte e varanda",
    area: "Apartamentos", format: "Stories", funnel: "Fundo", status: "agendado",
    date: "2026-07-26", time: "10:00", tags: ["Apartamentos", "Localização", "Stories"] },

  { id: "c5", title: "Por que construir a casa exatamente como sonhou ficou mais possível em Campinas",
    area: "Terrenos", format: "Carrossel", funnel: "Topo", status: "agendado",
    date: "2026-07-27", time: "15:30", tags: ["Terrenos", "Construção", "Carrossel"] },

  { id: "c6", title: "Planta compacta com marcenaria já inclusa: vale a pena?",
    area: "Studios", format: "Reels", funnel: "Meio", status: "agendado",
    date: "2026-07-29", time: "19:30", tags: ["Studios", "Primeiro imóvel", "Reels"] },

  { id: "c7", title: "Pronto ou na planta: o comparativo honesto para condomínios",
    area: "Condomínios", format: "Reels", funnel: "Meio", status: "agendado",
    date: "2026-08-05", time: "09:00", tags: ["Condomínios", "Família", "Reels"] },

  { id: "c8", title: "7 coisas que ninguém te conta sobre apartamentos em Campinas",
    area: "Apartamentos", format: "Reels", funnel: "Topo", status: "publicado",
    date: "2026-07-11", time: "19:00", tags: ["Apartamentos", "Sair do aluguel", "Reels"] },

  { id: "c9", title: "5 perguntas para fazer antes de fechar um studio",
    area: "Studios", format: "Carrossel", funnel: "Meio", status: "publicado",
    date: "2026-07-14", time: "12:30", tags: ["Studios", "Investimento", "Carrossel"] },

  { id: "c10", title: "Últimas unidades: lançamento na planta com entrada facilitada",
    area: "Lançamentos", format: "Reels", funnel: "Fundo", status: "publicado",
    date: "2026-08-02", time: "18:00", tags: ["Lançamentos", "Planta", "Reels"] },

  { id: "c11", title: "Por que ter fim de semana completo dentro do condomínio muda a rotina",
    area: "Condomínios", format: "Carrossel", funnel: "Topo", status: "publicado",
    date: "2026-08-05", time: "13:00", tags: ["Condomínios", "Segurança", "Carrossel"] },

  { id: "c12", title: "Quanto custa de verdade receber convidados com estrutura à altura em Campinas",
    area: "Casas", format: "Stories", funnel: "Topo", status: "publicado",
    date: "2026-08-09", time: "16:00", tags: ["Casas", "Lazer", "Stories"] },

  { id: "c13", title: "O bairro certo muda o preço do metro quadrado — e ninguém te explica",
    area: "Apartamentos", format: "TikTok", funnel: "Topo", status: "publicado",
    date: "2026-07-21", time: "20:00", tags: ["Apartamentos", "Localização", "TikTok"] },

  { id: "c14", title: "Terreno em condomínio fechado: o que checar antes de assinar",
    area: "Terrenos", format: "Carrossel", funnel: "Meio", status: "rascunho",
    date: "2026-08-19", time: "10:00", tags: ["Terrenos", "Documentação"] },

  { id: "c15", title: "Sair do aluguel em 2026: a conta que todo inquilino deveria fazer",
    area: "Apartamentos", format: "Reels", funnel: "Fundo", status: "rascunho",
    date: "2026-08-21", time: "18:30", tags: ["Apartamentos", "Sair do aluguel"] }
];

const SEED_ATIVIDADES = [
  { icon: "i-calendar", text: '"Pronto ou na planta: o comparativo honesto para condomínios" mudou de data', dias: 19 },
  { icon: "i-kanban", text: '"3 perguntas para fazer antes de fechar um imóvel comercial" foi movido para Aprovado', dias: 19 },
  { icon: "i-calendar-clock", text: '"3 perguntas para fazer antes de fechar um imóvel comercial" foi movido para Agendado', dias: 19 },
  { icon: "i-sparkle", text: '"Laje corporativa com piso elevado e ar central — agende sua visita" foi criado', dias: 22 },
  { icon: "i-sparkle", text: '"Quanto custa de verdade receber convidados com estrutura à altura em Campinas" foi criado', dias: 26 },
  { icon: "i-send", text: '"7 coisas que ninguém te conta sobre apartamentos em Campinas" foi publicado', dias: 35 }
];

// Estado inicial de uma conta. Só a conta de demonstração nasce com acervo.
function estadoSemente({ plano = "gratuito", comAcervo = false } = {}) {
  return {
    itens: comAcervo ? SEED_ITENS.map((i) => ({ ...i, tags: [...i.tags] })) : [],
    compromissos: [],
    atividades: comAcervo
      ? SEED_ATIVIDADES.map((a) => ({ icon: a.icon, text: a.text, at: HOJE.getTime() - a.dias * 86400000 }))
      : [],
    plano,
    usadas: 0,
    config: { ...CONFIG_PADRAO }
  };
}

/* ---------------- Roteiro ---------------- */
// A geração em si vive em roteiro.js. Aqui fica só o contrato dos campos.

const CAMPOS_ROTEIRO = [
  ["titulo", "Título"],
  ["gancho", "Gancho (0–3s)"],
  ["desenvolvimento", "Desenvolvimento (3–20s)"],
  ["prova", "Prova (20–35s)"],
  ["cta", "CTA (35–45s)"],
  ["legenda", "Legenda"],
  ["hashtags", "Hashtags"],
  ["objetivo", "Objetivo"],
  ["publico", "Público ideal"],
  ["formatoNota", "Formato"],
  ["gravacao", "Sugestão de gravação"]
];

/* ---------------- Utilidades de data ---------------- */

function toIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDay(iso) {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} de ${MESES_CURTOS[month - 1]}`;
}

function formatFull(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} de ${MESES[month - 1].toLowerCase()} de ${year}`;
}

function relativeTime(ts) {
  const dias = Math.round((HOJE.getTime() - ts) / 86400000);
  if (dias <= 0) return "agora há pouco";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.round(dias / 30);
  return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
}

function slugArea(text) {
  return text.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
}
