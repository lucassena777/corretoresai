// Sementes e constantes da demonstração.
// O estado vivo (o que o usuário cria, edita, arrasta e apaga) fica em store.js.

// true apenas no build de arquivo único (dist/preview.html), que roteia por hash.
const SPA = typeof PREVIEW_SPA !== "undefined" && PREVIEW_SPA;

const HOJE = new Date(2026, 7, 15); // 15 de agosto de 2026

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez"];

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

const PLANOS = {
  gratuito: { label: "Gratuito", cota: 5, preco: "R$ 0" },
  pro: { label: "Corretor Pro", cota: 40, preco: "R$ 29,90" },
  ilimitado: { label: "Ilimitado", cota: Infinity, preco: "R$ 49,90" }
};

const PERFIL_PADRAO = {
  nome: "Marina Duarte",
  creci: "SP 123.456-F",
  cidade: "Campinas",
  instagram: "@marinaduarte.imoveis",
  tom: "Direta, sem jargão de imobiliária e sempre explicando o custo real de morar no imóvel.",
  areas: ["Apartamentos", "Casas"]
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

/* ---------------- Gerador de roteiro ---------------- */

const GANCHOS = {
  Topo: "Todo mundo procura {area} em {cidade} do jeito errado. Olha o que ninguém te conta.",
  Meio: "Antes de escolher {area} em {cidade}, tem três coisas que mudam o preço final.",
  Fundo: "Se você já está decidido por {area} em {cidade}, esse é o momento de agendar a visita.",
  Personalizado: "{area} em {cidade}: a conversa que eu tenho com todo cliente antes de fechar."
};

const OBJETIVOS = {
  Topo: "Alcançar quem ainda não pensou em comprar",
  Meio: "Convencer quem está comparando opções",
  Fundo: "Converter quem já está decidido em visita agendada",
  Personalizado: "Campanha sob medida definida por você"
};

const TITULOS = {
  Topo: [
    "{n} coisas que ninguém te conta sobre {area} em {cidade}",
    "O erro que quase todo mundo comete ao procurar {area} em {cidade}",
    "{area} em {cidade}: o que muda o preço do metro quadrado"
  ],
  Meio: [
    "{n} perguntas para fazer antes de fechar {area} em {cidade}",
    "Pronto ou na planta: o comparativo honesto para {area}",
    "{area} em {cidade}: o que comparar antes de decidir"
  ],
  Fundo: [
    "Disponível agora: {area} em {cidade} — agende sua visita",
    "Últimas unidades de {area} em {cidade} com entrada facilitada",
    "{area} em {cidade}: marque a visita ainda esta semana"
  ],
  Personalizado: [
    "{area} em {cidade}: a campanha que eu faria hoje",
    "O que eu explico para todo cliente de {area} em {cidade}",
    "{area} em {cidade}: a conversa antes da proposta"
  ]
};

const TAGS_FUNIL = { Topo: "Alcance", Meio: "Comparação", Fundo: "Visita", Personalizado: "Campanha" };

function pick(list, seed) {
  return list[Math.abs(seed) % list.length];
}

// Monta os 11 campos entregues em cada conteúdo.
function buildScript(item, perfil) {
  const area = item.area.toLowerCase();
  const cidade = item.city || perfil.cidade || "sua cidade";
  const gancho = GANCHOS[item.funnel]
    .replace("{area}", area)
    .replace("{cidade}", cidade);

  return {
    titulo: item.title,
    gancho,
    desenvolvimento: item.briefing
      ? `Mostre o imóvel enquanto fala: ${item.briefing}`
      : "Mostre o imóvel destacando três diferenciais concretos: localização, planta e custo mensal real.",
    prova: "Traga um número: valor do metro quadrado da região, tempo médio de venda ou economia frente ao aluguel.",
    cta: "Comente “QUERO” que eu mando a ficha completa e a simulação no seu WhatsApp.",
    legenda: `${gancho}\n\nSalve esse post para quando for visitar ${area} em ${cidade}. Qualquer dúvida, chama no direct.`,
    hashtags: `#${area.replace(/\s/g, "")} #${cidade.toLowerCase().replace(/\s/g, "")} #corretordeimoveis #imoveis #${item.format.toLowerCase()}`,
    objetivo: OBJETIVOS[item.funnel],
    publico: `Quem procura ${area} em ${cidade} e está na etapa de ${item.funnel.toLowerCase()} do funil`,
    formatoNota: `${item.format} — corte a cada 3 segundos, legenda queimada e áudio em alta`,
    gravacao: perfil.tom
      ? `Tom de voz: ${perfil.tom} Grave na hora dourada e evite plano parado por mais de 4 segundos.`
      : "Grave na hora dourada, comece já dentro do imóvel e evite plano parado por mais de 4 segundos."
  };
}

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
