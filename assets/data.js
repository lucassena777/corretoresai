// Acervo de demonstração da conta Marina Duarte.
// O estado (data e status de cada card) é persistido em localStorage assim que
// o usuário arrasta algo no calendário ou no Kanban.

const STORAGE_KEY = "corretoresai-conteudos";

const SEED = [
  {
    id: "c1",
    title: "3 perguntas para fazer antes de fechar um imóvel comercial",
    area: "Comercial", format: "Reels", status: "aprovado",
    date: "2026-07-24", time: "17:00", tags: ["Comercial", "Renda", "Reels"]
  },
  {
    id: "c2",
    title: "Pronto ou na planta: o comparativo honesto para casas",
    area: "Casas", format: "TikTok", status: "aprovado",
    date: "2026-07-31", time: "20:30", tags: ["Casas", "Família", "TikTok"]
  },
  {
    id: "c3",
    title: "Laje corporativa com piso elevado e ar central — agende sua visita",
    area: "Comercial", format: "Carrossel", status: "aprovado",
    date: "2026-08-07", time: "11:00", tags: ["Comercial", "Visita", "Carrossel"]
  },
  {
    id: "c4",
    title: "Disponível agora: 2 dormitórios com suíte e varanda",
    area: "Apartamentos", format: "Stories", status: "agendado",
    date: "2026-07-26", time: "10:00", tags: ["Apartamentos", "Localização", "Stories"]
  },
  {
    id: "c5",
    title: "Por que construir a casa exatamente como sonhou ficou mais possível em Campinas",
    area: "Terrenos", format: "Carrossel", status: "agendado",
    date: "2026-07-27", time: "15:30", tags: ["Terrenos", "Construção", "Carrossel"]
  },
  {
    id: "c6",
    title: "Planta compacta com marcenaria já inclusa: vale a pena?",
    area: "Studios", format: "Reels", status: "agendado",
    date: "2026-07-29", time: "19:30", tags: ["Studios", "Primeiro imóvel", "Reels"]
  },
  {
    id: "c7",
    title: "Pronto ou na planta: o comparativo honesto para condomínios",
    area: "Condomínios", format: "Reels", status: "agendado",
    date: "2026-08-05", time: "09:00", tags: ["Condomínios", "Família", "Reels"]
  },
  {
    id: "c8",
    title: "7 coisas que ninguém te conta sobre apartamentos em Campinas",
    area: "Apartamentos", format: "Reels", status: "publicado",
    date: "2026-07-11", time: "19:00", tags: ["Apartamentos", "Sair do aluguel", "Reels"]
  },
  {
    id: "c9",
    title: "5 perguntas para fazer antes de fechar um studio",
    area: "Studios", format: "Carrossel", status: "publicado",
    date: "2026-07-14", time: "12:30", tags: ["Studios", "Investimento", "Carrossel"]
  },
  {
    id: "c10",
    title: "Últimas unidades: lançamento na planta com entrada facilitada",
    area: "Lançamentos", format: "Reels", status: "publicado",
    date: "2026-08-02", time: "18:00", tags: ["Lançamentos", "Planta", "Reels"]
  },
  {
    id: "c11",
    title: "Por que ter fim de semana completo dentro do condomínio muda a rotina",
    area: "Condomínios", format: "Carrossel", status: "publicado",
    date: "2026-08-05", time: "13:00", tags: ["Condomínios", "Segurança", "Carrossel"]
  },
  {
    id: "c12",
    title: "Quanto custa de verdade receber convidados com estrutura à altura em Campinas",
    area: "Casas", format: "Stories", status: "publicado",
    date: "2026-08-09", time: "16:00", tags: ["Casas", "Lazer", "Stories"]
  },
  {
    id: "c13",
    title: "O bairro certo muda o preço do metro quadrado — e ninguém te explica",
    area: "Apartamentos", format: "TikTok", status: "publicado",
    date: "2026-07-21", time: "20:00", tags: ["Apartamentos", "Localização", "TikTok"]
  },
  {
    id: "c14",
    title: "Terreno em condomínio fechado: o que checar antes de assinar",
    area: "Terrenos", format: "Carrossel", status: "rascunho",
    date: "2026-08-19", time: "10:00", tags: ["Terrenos", "Documentação"]
  },
  {
    id: "c15",
    title: "Sair do aluguel em 2026: a conta que todo inquilino deveria fazer",
    area: "Apartamentos", format: "Reels", status: "rascunho",
    date: "2026-08-21", time: "18:30", tags: ["Apartamentos", "Sair do aluguel"]
  }
];

const STATUSES = {
  aprovado: { label: "Aprovado", hint: "Pronto para produzir", color: "var(--warn)" },
  agendado: { label: "Agendado", hint: "Com data confirmada", color: "var(--info)" },
  publicado: { label: "Publicado", hint: "Já está no ar", color: "var(--ok)" }
};

const ATIVIDADES = [
  { icon: "i-calendar", text: '"Pronto ou na planta: o comparativo honesto para condomínios" mudou de data', when: "há 19 dias" },
  { icon: "i-kanban", text: '"3 perguntas para fazer antes de fechar um imóvel comercial" foi movido para Aprovado', when: "há 19 dias" },
  { icon: "i-calendar-clock", text: '"3 perguntas para fazer antes de fechar um imóvel comercial" foi movido para Agendado', when: "há 19 dias" },
  { icon: "i-sparkle", text: '"Laje corporativa com piso elevado e ar central — agende sua visita" foi criado', when: "há 22 dias" },
  { icon: "i-sparkle", text: '"Quanto custa de verdade receber convidados com estrutura à altura em Campinas" foi criado', when: "há 26 dias" },
  { icon: "i-send", text: '"7 coisas que ninguém te conta sobre apartamentos em Campinas" foi publicado', when: "há 35 dias" }
];

const HOJE = new Date(2026, 7, 15); // 15 de agosto de 2026 — "hoje" da demonstração

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez"];

function loadItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return structuredClone(SEED);
    // Mantém os textos do seed e aplica apenas data/status salvos.
    return SEED.map((item) => {
      const hit = saved.find((s) => s.id === item.id);
      return hit ? { ...item, date: hit.date, status: hit.status } : { ...item };
    });
  } catch {
    return structuredClone(SEED);
  }
}

function saveItems(items) {
  const slim = items.map(({ id, date, status }) => ({ id, date, status }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
}

function boardItems(items) {
  return items.filter((item) => item.status in STATUSES);
}

function formatDay(iso) {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} de ${MESES_CURTOS[month - 1]}`;
}
