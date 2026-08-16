// Back-end de IA do CorretoresAI. Dois modos, uma chave:
//
//   modo "chat"     — o Copiloto da área logada (streaming + ações)
//   modo "roteiro"  — a Central de Conteúdo (3 ideias com os 11 campos, em JSON)
//
// A função existe por um motivo só: a chave da API não pode ficar no navegador.
// O site é estático e público — qualquer chave publicada ali seria copiada e
// cobrada de você. Aqui ela vive como secret do projeto e nunca sai daqui.
//
// Provedor: Google Gemini (AI Studio), via REST puro — sem SDK, sem npm. O
// contrato com o navegador não mudou: os mesmos eventos SSE (texto, acao, fim,
// erro) e o mesmo JSON de roteiro. Trocar de provedor de novo mexe só aqui.

// Por que flash e não pro: com uma chave nova do AI Studio, gemini-2.5-pro e
// gemini-2.5-flash respondem 404 ("no longer available to new users") e
// gemini-pro-latest responde 429 (o plano gratuito não dá cota para os modelos
// pro). O flash é o que o plano gratuito realmente entrega — testado.
const MODELO = "gemini-3.5-flash";
const BASE_API = "https://generativelanguage.googleapis.com/v1beta/models";

const ORIGENS = [
  /^https:\/\/lucassena777\.github\.io$/,
  /^https:\/\/[a-z0-9-]+\.frame\.claudeusercontent\.com$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

const LIMITE = {
  mensagensPorTurno: 24,
  caracteresPorMensagem: 4000,
  // Trechos da base de conhecimento que o navegador manda junto com a pergunta.
  caracteresDaBase: 12000,
  pedidosPorMinuto: 12,
};

const janelas = new Map<string, { inicio: number; total: number }>();

function excedeuLimite(ip: string): boolean {
  const agora = Date.now();
  const janela = janelas.get(ip);
  if (!janela || agora - janela.inicio > 60_000) {
    janelas.set(ip, { inicio: agora, total: 1 });
    return false;
  }
  janela.total += 1;
  return janela.total > LIMITE.pedidosPorMinuto;
}

const origemLiberada = (origem: string | null) =>
  Boolean(origem) && ORIGENS.some((re) => re.test(origem!));

// O cabeçalho reflete a origem mesmo quando ela não é liberada. Parece
// contraintuitivo, mas é o que faz a recusa chegar legível no navegador: sem
// isso o pedido morre no CORS e o site só vê "Failed to fetch", sem motivo.
// Quem barra é o 403 com mensagem, não a ausência do cabeçalho.
function cabecalhosCors(origem: string | null) {
  return {
    "Access-Control-Allow-Origin": origem || "*",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

/* ---------------- Chamada ao Gemini ---------------- */

function chamar(caminho: string, chave: string, corpo: unknown, sinal?: AbortSignal) {
  return fetch(`${BASE_API}/${MODELO}:${caminho}`, {
    method: "POST",
    signal: sinal,
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": chave,
    },
    body: JSON.stringify(corpo),
  });
}

// Erro do Google chega como {"error":{"code":429,"status":"RESOURCE_EXHAUSTED",
// "message":"..."}}. Vira mensagem em português com o status certo: o que o
// corretor resolve (esperar) separado do que só o dono do projeto resolve.
function traduzirHttp(status: number, texto: string): { mensagem: string; status: number } {
  let detalhe = texto;
  let situacao = "";
  try {
    const erro = JSON.parse(texto)?.error;
    if (erro?.message) detalhe = erro.message;
    if (erro?.status) situacao = erro.status;
  } catch { /* deixa o texto cru */ }

  if (status === 400 && /API key not valid|API_KEY_INVALID/i.test(detalhe)) {
    return { mensagem: "A chave do Gemini foi recusada. Confira o secret GEMINI_API_KEY no projeto.", status: 503 };
  }
  if (status === 403 || situacao === "PERMISSION_DENIED") {
    return { mensagem: "Esta chave não tem permissão para usar o modelo.", status: 503 };
  }
  if (status === 404) {
    return { mensagem: `O modelo ${MODELO} não está disponível para esta chave.`, status: 503 };
  }
  if (status === 429 || situacao === "RESOURCE_EXHAUSTED") {
    return { mensagem: "O limite do plano gratuito do Gemini foi atingido. Espere um pouco e tente de novo.", status: 429 };
  }
  if (status === 503 || situacao === "UNAVAILABLE") {
    return { mensagem: "O modelo está sobrecarregado. Tente de novo em instantes.", status: 503 };
  }
  if (status >= 500) {
    return { mensagem: "A API do Gemini teve uma falha temporária. Tente de novo.", status: 502 };
  }
  return { mensagem: detalhe || `Erro ${status} na API do Gemini.`, status: 500 };
}

function traduzirExcecao(e: unknown): { mensagem: string; status: number } {
  const bruto = e instanceof Error ? e.message : String(e);
  if (/abort|timed out|timeout/i.test(bruto)) {
    return { mensagem: "A resposta demorou demais e foi interrompida.", status: 504 };
  }
  return { mensagem: bruto || "Erro inesperado.", status: 500 };
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Uma tentativa extra para falha transitória (limite momentâneo, sobrecarga,
// 5xx). Chave inválida não se resolve tentando de novo — essa sobe na hora.
async function comRetentativa(tarefa: () => Promise<Response>): Promise<Response> {
  const resposta = await tarefa();
  if (resposta.ok) return resposta;

  const transitorio = resposta.status === 429 || resposta.status >= 500;
  if (!transitorio) return resposta;

  await esperar(1500);
  return await tarefa();
}

/* ---------------- Persona compartilhada ---------------- */

function perfilEmTexto(ctx: Record<string, unknown>) {
  return [
    ctx.nome && `Nome: ${ctx.nome}`,
    ctx.creci && `CRECI: ${ctx.creci}`,
    ctx.cidade && `Cidade de atuação: ${ctx.cidade}`,
    ctx.imobiliaria && `Imobiliária: ${ctx.imobiliaria}`,
    Array.isArray(ctx.areas) && ctx.areas.length && `Áreas: ${(ctx.areas as string[]).join(", ")}`,
    ctx.bio && `Bio: ${ctx.bio}`,
    ctx.tom && `Tom de voz preferido: ${ctx.tom}`,
  ].filter(Boolean).join("\n");
}

const PERSONA = `Você é o **Copiloto CorretoresAI**: mentor imobiliário sênior, estrategista de vendas e especialista em copywriting de alto padrão. Trabalha ao lado de corretores de imóveis brasileiros, do primeiro imóvel ao alto padrão.

Fale como consultor, não como manual: frases diretas, fundamentadas, sem jargão de guru de internet. Nada de "arrase nas redes", "bombar", emoji de fogo ou lista genérica de dicas.

Quando falar de mercado, seja concreto sobre o mecanismo (o que sustenta preço numa região, o que reduz tempo de venda, o que trava um financiamento) e honesto quando não souber um dado específico daquela cidade. Nunca invente índice, percentual ou pesquisa — se citar um número, ele tem que vir do que o corretor te contou.

Escreva em português do Brasil, com acentuação, concordância e pontuação impecáveis.`;

/* ---------------- Modo chat ---------------- */

function blocoBase(base: string) {
  return `# Base de conhecimento da plataforma

Os trechos abaixo vieram da base interna do CorretoresAI e são a fonte correta
sobre como a plataforma funciona. Quando a pergunta for sobre ela, responda POR
ELES — nunca invente tela, botão, preço ou funcionalidade que não esteja aqui.
Se a base não cobrir o que foi perguntado, diga isso e responda com o que você
sabe de mercado.

Não cite "a base de conhecimento" nem diga que consultou um documento: fale como
quem conhece o produto de dentro.

${base}`;
}

/* ---------------- Ferramentas do copiloto ----------------
   Quem executa é o navegador: a função só decide QUE ação tomar e com que
   argumentos. O item entra no calendário pelo store da conta, no aparelho do
   corretor, onde os dados dele já moram.

   O schema segue o subconjunto de OpenAPI que o Gemini aceita: tipos em
   maiúsculas e sem additionalProperties. */

const FERRAMENTAS = [{
  functionDeclarations: [{
    name: "agendar_conteudo",
    description:
      "Cria um conteúdo no calendário editorial do corretor, com data marcada. " +
      "Use quando ele pedir para agendar, marcar, programar ou colocar um post " +
      "no calendário. Não use para simplesmente escrever um texto — só quando " +
      "ele quiser a peça registrada numa data.",
    parameters: {
      type: "OBJECT",
      properties: {
        tema: {
          type: "STRING",
          description: "Do que o conteúdo trata, em uma frase. Ex.: 'apartamentos de 2 dormitórios em Atibaia'.",
        },
        area: {
          type: "STRING",
          enum: ["Apartamentos", "Casas", "Lançamentos", "Alto padrão", "Comercial", "Terrenos", "Aluguel"],
          description: "Área de atuação. Escolha a mais próxima do pedido; na dúvida, use a área principal do corretor.",
        },
        data: {
          type: "STRING",
          description: "Data da publicação em AAAA-MM-DD. Se o corretor disser só o dia ('dia 20'), use o mês atual; se a data já passou, use o mês seguinte.",
        },
        horario: {
          type: "STRING",
          description: "Hora da publicação em HH:MM (24h). Se ele não disser, deixe vazio.",
        },
        formato: {
          type: "STRING",
          enum: ["Reels", "Carrossel", "Stories", "TikTok"],
          description: "Formato da peça. Se ele não disser, use Reels.",
        },
        funil: {
          type: "STRING",
          enum: ["Topo", "Meio", "Fundo", "Personalizado"],
          description: "Etapa do funil. Se ele não disser, escolha pela intenção do conteúdo.",
        },
        cidade: {
          type: "STRING",
          description: "Cidade ou bairro citado no pedido. Deixe vazio se ele não citou nenhum.",
        },
      },
      // cidade e horario entram como obrigatórios de propósito. Sendo
      // opcionais, o modelo às vezes os omitia, e o conteúdo saía assinado com
      // a cidade padrão do perfil — um post sobre Atibaia virava Campinas. A
      // descrição manda deixar vazio quando não houver; vazio o navegador
      // resolve, ausente ele não tem como saber.
      required: ["tema", "area", "data", "horario", "formato", "funil", "cidade"],
    },
  }],
}];

function systemChat(ctx: Record<string, unknown>) {
  const perfil = perfilEmTexto(ctx);
  return `${PERSONA}

Você é o copiloto dentro do CorretoresAI — a plataforma onde este corretor planeja e produz o conteúdo dele. Além de estratégia de mercado, você atende o que a Central de Conteúdo não faz: e-mail para cliente, resposta a objeção, roteiro de reunião presencial, legenda avulsa e dúvida sobre a própria plataforma.

# Como você raciocina antes de escrever

Percorra estas quatro etapas internamente, sem mostrá-las na resposta:

1. **Situe o caso** — que imóvel e que cliente estão em jogo. Região, faixa de preço, tipo de comprador. Um studio de 30 m² perto do metrô e uma casa de 400 m² em condomínio fechado não se vendem com o mesmo argumento.
2. **Encontre a dor real e o gatilho de decisão** — o que trava esse cliente (medo de errar, falta de referência de preço, orçamento, prazo, decisor ausente) e o que destrava (prova, comparação, segurança jurídica, urgência legítima). A pergunta que chega quase nunca é a pergunta que importa.
3. **Puxe o repertório certo** — legislação e documentação, precificação por metro quadrado, tratamento de objeção, técnica de persuasão honesta. Use o que se aplica a ESTE caso, não o que é genericamente verdadeiro.
4. **Estruture a entrega** — no formato abaixo, com gramática impecável e postura de quem já fez isso muitas vezes.

Se faltar informação para responder bem, pergunte **uma** coisa — a que mais muda a resposta — e responda o resto com o que já tem.

# Antes de tudo: pedido de agendamento é ação, não redação

Você tem a ferramenta **agendar_conteudo**, que cria o conteúdo direto no calendário editorial dele.

Se o corretor pedir para **agendar, marcar, programar ou colocar no calendário**, essa é a resposta certa e ela é curta:

1. Uma frase dizendo o que você vai agendar — data, tema e formato — para ele conferir.
2. A chamada da ferramenta.

Nada além disso. **Não escreva o roteiro, não escreva legenda, não use os três blocos do formato abaixo.** Ele pediu uma ação; entregue a ação. O roteiro a plataforma já monta sozinha, e ele abre no editor se quiser mexer.

Uma chamada por peça: se ele pedir três posts na semana que vem, chame três vezes, uma por data.

Só peça confirmação se faltar a data ou se o pedido for mesmo ambíguo. "Agende um post sobre casas em Atibaia para a próxima terça às 14h" tem tudo: agende.

Hoje é ${ctx.hoje ?? "data não informada"}. Use isso para resolver "amanhã", "sexta", "dia 20" e "semana que vem".

# Formato da resposta (quando NÃO for agendamento)

Entregue em três blocos, nesta ordem, usando estes títulos:

**Diagnóstico** — duas ou três linhas situando estrategicamente o que está em jogo naquela dúvida. Não repita a pergunta de volta; mostre o que ela revela.

**Plano de ação** — o miolo: o roteiro, o texto, os passos ou a explicação. Direto e aplicável hoje. Quando sugerir algo para o corretor dizer ou enviar, **escreva o texto pronto** — não descreva o que ele deveria dizer. Use lista numerada só quando a ordem importar.

**Dica de ouro** — uma linha ou duas sobre como se posicionar ao usar isso na prática: o que falar antes, o que não entregar de graça, onde a maioria dos corretores erra o timing.

Duas exceções ao formato, para não ficar burocrático: se a pergunta for objetiva e fechada (um "quanto custa o plano Pro?", um "onde fica o Kanban?"), responda em uma ou duas linhas e pule os blocos. E se você precisar de mais informação, faça a pergunta antes de qualquer bloco.

Nunca abra com resumo do que você vai dizer, nunca feche com resumo do que disse.

# Limites

Sobre legislação e tributos: explique o funcionamento geral com clareza (CRECI, contrato, matrícula, ITBI, escritura, direito de arrependimento) e deixe explícito quando o caso exige advogado ou contador. Você orienta; você não substitui parecer jurídico.

Nunca prometa valorização garantida nem rentabilidade futura em percentual.

# O corretor com quem você está falando

${perfil || "(perfil ainda não preenchido — pergunte a cidade e a área de atuação quando isso mudar a resposta)"}`;
}

/* ---------------- Modo roteiro ---------------- */

const TEXTO = { type: "STRING" };

const ESQUEMA = {
  type: "OBJECT",
  properties: {
    ideias: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          angulo: { type: "STRING", enum: ["analise", "estilo", "decisao"] },
          titulo: TEXTO,
          gancho: TEXTO,
          desenvolvimento: TEXTO,
          prova: TEXTO,
          cta: TEXTO,
          legenda: TEXTO,
          hashtags: TEXTO,
          objetivo: TEXTO,
          publico: TEXTO,
          formatoNota: TEXTO,
          gravacao: TEXTO,
          tags: { type: "ARRAY", items: TEXTO },
        },
        required: [
          "angulo", "titulo", "gancho", "desenvolvimento", "prova", "cta",
          "legenda", "hashtags", "objetivo", "publico", "formatoNota", "gravacao", "tags",
        ],
        propertyOrdering: [
          "angulo", "titulo", "gancho", "desenvolvimento", "prova", "cta",
          "legenda", "hashtags", "objetivo", "publico", "formatoNota", "gravacao", "tags",
        ],
      },
    },
  },
  required: ["ideias"],
};

function systemRoteiro(ctx: Record<string, unknown>) {
  const perfil = perfilEmTexto(ctx);
  return `${PERSONA}

# Sua tarefa

Você escreve roteiros de conteúdo para redes sociais a partir de um briefing de imóvel. Devolva **exatamente três ideias**, uma de cada ângulo, nesta ordem:

1. **analise** — Análise e valorização. A dinâmica do bairro, a infraestrutura em volta, o que sustenta o metro quadrado ali, como a metragem do imóvel se compara com o que a região oferece.
2. **estilo** — Estilo de vida e funcionalidade. Como a planta e a localização resolvem a rotina de quem vai morar. Concreto sobre o dia a dia, não adjetivo solto.
3. **decisao** — Oportunidade e decisão. Números de mercado, documentação, segurança jurídica e por que este é o momento (ou não é) de fechar.

Antes de escrever, identifique quem compra este imóvel e qual é o gatilho de decisão dessa pessoa. As três ideias falam do mesmo imóvel e não podem se repetir: título, gancho, chamada e argumento têm que ser diferentes entre elas.

# Os campos

- **titulo** — impactante e profissional, sem clichê de rede social. Nada de "você não vai acreditar" nem de numeração forçada.
- **gancho** — os 3 primeiros segundos. Demonstre domínio técnico do mercado local. Uma ou duas frases.
- **desenvolvimento** — o corpo do roteiro, em 2 ou 3 parágrafos curtos separados por linha em branco. Fala fluida, elegante, para ser dita em voz alta.
- **prova** — o que sustenta o argumento: um mecanismo de mercado, uma comparação honesta, um critério de checagem. Se o briefing trouxe número, use o número dele.
- **cta** — elegante e de relacionamento, nunca "chama no direct" genérico. Ex.: "Envie uma mensagem para receber a análise completa deste imóvel."
- **legenda** — o texto do post, pronto para colar, com quebras de linha. Termine assinando com o nome do corretor.
- **hashtags** — 5 a 7 hashtags separadas por espaço, minúsculas, sem acento, começando com #.
- **objetivo** — o que essa peça busca no funil, em uma linha.
- **publico** — quem deve ver isso, em uma linha.
- **formatoNota** — orientação de montagem para o formato pedido (duração, cortes, número de lâminas).
- **gravacao** — como gravar: luz, enquadramento, ritmo. Se houver tom de voz no perfil, respeite-o.
- **tags** — 3 etiquetas curtas para organizar o conteúdo (ex.: área, ângulo, formato).

Use a cidade e o bairro exatamente como vierem no briefing — já estão com a grafia correta. Não invente característica que o briefing não mencionou.

# O corretor

${perfil || "(perfil ainda não preenchido)"}`;
}

function briefingEmTexto(b: Record<string, unknown>) {
  return [
    `Área de atuação: ${b.area ?? "não informada"}`,
    `Local: ${b.local ?? "não informado"}`,
    `Etapa do funil: ${b.funil ?? "Topo"}`,
    `Formato: ${b.formato ?? "Reels"}`,
    b.ficha && `Ficha do imóvel: ${b.ficha}`,
    b.valor && `Valor: ${b.valor}`,
    b.caracteristicas && `Diferenciais: ${b.caracteristicas}`,
    b.descricao && `Descrição do corretor: ${b.descricao}`,
  ].filter(Boolean).join("\n");
}

/* ---------------- Handler ---------------- */

Deno.serve(async (req: Request) => {
  const origem = req.headers.get("origin");
  const cors = cabecalhosCors(origem);
  const json = (dados: unknown, status = 200) =>
    new Response(JSON.stringify(dados), {
      status,
      headers: { ...cors, "content-type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);
  if (!origemLiberada(origem)) {
    return json({ erro: `Origem não autorizada: ${origem ?? "(sem origem)"}` }, 403);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "desconhecido";
  if (excedeuLimite(ip)) return json({ erro: "Muitas requisições seguidas. Espere um minuto." }, 429);

  const chave = (Deno.env.get("GEMINI_API_KEY") ?? "").trim();
  if (!chave) {
    return json({ erro: "A IA ainda não foi configurada: falta a chave da API no projeto." }, 503);
  }

  let corpo: {
    modo?: string;
    mensagens?: { papel: string; texto: string }[];
    briefing?: Record<string, unknown>;
    contexto?: Record<string, unknown>;
    base?: string;
  };
  try {
    corpo = await req.json();
  } catch {
    return json({ erro: "Corpo inválido." }, 400);
  }

  const contexto = corpo.contexto ?? {};

  /* ----- Roteiro: resposta única em JSON ----- */

  if (corpo.modo === "roteiro") {
    try {
      const resposta = await comRetentativa(() => chamar("generateContent", chave, {
        systemInstruction: { parts: [{ text: systemRoteiro(contexto) }] },
        contents: [{
          role: "user",
          parts: [{
            text: `Escreva as três ideias para este briefing:\n\n${briefingEmTexto(corpo.briefing ?? {})}`,
          }],
        }],
        generationConfig: {
          maxOutputTokens: 12000,
          responseMimeType: "application/json",
          responseSchema: ESQUEMA,
        },
      }));

      if (!resposta.ok) {
        const { mensagem, status } = traduzirHttp(resposta.status, await resposta.text());
        return json({ erro: mensagem }, status);
      }

      const dados = await resposta.json();
      const candidato = dados?.candidates?.[0];

      if (candidato?.finishReason === "SAFETY" || candidato?.finishReason === "PROHIBITED_CONTENT") {
        return json({ erro: "O modelo recusou este briefing. Tente reescrevê-lo." }, 422);
      }
      if (candidato?.finishReason === "MAX_TOKENS") {
        return json({ erro: "A resposta passou do tamanho máximo. Encurte o briefing." }, 502);
      }

      const texto = (candidato?.content?.parts ?? [])
        .map((p: { text?: string }) => p.text ?? "")
        .join("");

      if (!texto.trim()) return json({ erro: "Resposta vazia do modelo." }, 502);

      let saida: { ideias?: unknown[] };
      try {
        saida = JSON.parse(texto);
      } catch {
        return json({ erro: "O modelo devolveu um JSON que não deu para ler." }, 502);
      }

      const ideias = Array.isArray(saida.ideias) ? saida.ideias.slice(0, 3) : [];
      if (!ideias.length) return json({ erro: "O modelo não devolveu nenhuma ideia." }, 502);

      return json({ ideias });
    } catch (e) {
      const { mensagem, status } = traduzirExcecao(e);
      return json({ erro: mensagem }, status);
    }
  }

  /* ----- Chat: streaming ----- */

  const mensagens = (corpo.mensagens ?? [])
    .slice(-LIMITE.mensagensPorTurno)
    .filter((m) => m && typeof m.texto === "string" && m.texto.trim())
    .map((m) => ({
      role: m.papel === "assistente" ? "model" : "user",
      parts: [{ text: m.texto.slice(0, LIMITE.caracteresPorMensagem) }],
    }));

  if (!mensagens.length || mensagens[0].role !== "user") {
    return json({ erro: "Nenhuma pergunta recebida." }, 400);
  }

  const base = typeof corpo.base === "string"
    ? corpo.base.slice(0, LIMITE.caracteresDaBase)
    : "";

  // A base de conhecimento vem ANTES das regras de operação, nunca depois.
  // Com ela no fim, os trechos recuperados ficavam na posição de maior peso e
  // o modelo escrevia um texto sobre estratégia de conteúdo em vez de chamar a
  // ferramenta de agendar. Contexto primeiro, ordem de trabalho por último.
  const instrucao = base
    ? `${blocoBase(base)}\n\n---\n\n${systemChat(contexto)}`
    : systemChat(contexto);

  try {
    const resposta = await chamar("streamGenerateContent?alt=sse", chave, {
      systemInstruction: { parts: [{ text: instrucao }] },
      contents: mensagens,
      tools: FERRAMENTAS,
      generationConfig: { maxOutputTokens: 4000 },
    });

    if (!resposta.ok || !resposta.body) {
      const { mensagem, status } = traduzirHttp(resposta.status, await resposta.text());
      return json({ erro: mensagem }, status);
    }

    const encoder = new TextEncoder();
    const sse = new ReadableStream({
      async start(controller) {
        const enviar = (evento: string, dados: unknown) =>
          controller.enqueue(encoder.encode(`event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`));

        // O primeiro token pode demorar (o modelo pensa antes). Um comentário
        // SSE a cada 12s segura a conexão sem sujar o texto — o cliente ignora
        // linhas que começam com ":".
        const pulso = setInterval(() => {
          try { controller.enqueue(encoder.encode(": vivo\n\n")); } catch { /* fechado */ }
        }, 12_000);

        const leitor = resposta.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let motivo = "";

        // Cada "data:" do Gemini traz um pedaço com partes de texto e, quando
        // ele decide agir, partes functionCall.
        const consumir = (bruto: string) => {
          let pacote;
          try { pacote = JSON.parse(bruto); } catch { return; }

          if (pacote.error) throw new Error(pacote.error.message ?? "Erro do Gemini.");

          const candidato = pacote.candidates?.[0];
          if (!candidato) return;
          if (candidato.finishReason) motivo = candidato.finishReason;

          for (const parte of candidato.content?.parts ?? []) {
            if (typeof parte.text === "string" && parte.text) enviar("texto", parte.text);
            if (parte.functionCall) {
              enviar("acao", { nome: parte.functionCall.name, entrada: parte.functionCall.args ?? {} });
            }
          }
        };

        // O Gemini separa os eventos com CRLF duplo, não LF duplo. Cortar em
        // "\n\n" não acha separador nenhum: tudo fica no buffer e a resposta
        // chega vazia. Por isso a expressão aceita as duas formas.
        const lerBlocos = (texto: string) => {
          for (const bloco of texto.split(/\r?\n\r?\n/)) {
            for (const linha of bloco.split(/\r?\n/)) {
              if (linha.startsWith("data:")) consumir(linha.slice(5).trim());
            }
          }
        };

        try {
          while (true) {
            const { done, value } = await leitor.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const corte = buffer.lastIndexOf("\n\n");
            if (corte === -1) continue;

            lerBlocos(buffer.slice(0, corte));
            buffer = buffer.slice(corte + 2);
          }

          if (buffer.trim()) lerBlocos(buffer);

          if (motivo === "SAFETY" || motivo === "PROHIBITED_CONTENT") {
            enviar("erro", { mensagem: "O modelo preferiu não responder a essa pergunta." });
          } else {
            enviar("fim", { motivo });
          }
        } catch (e) {
          enviar("erro", { mensagem: traduzirExcecao(e).mensagem });
        } finally {
          clearInterval(pulso);
          controller.close();
        }
      },
      cancel() {
        // Aba fechada ou pergunta cancelada: não continue baixando resposta.
        resposta.body?.cancel().catch(() => {});
      },
    });

    return new Response(sse, {
      headers: {
        ...cors,
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        "connection": "keep-alive",
        "x-accel-buffering": "no",
      },
    });
  } catch (e) {
    const { mensagem, status } = traduzirExcecao(e);
    return json({ erro: mensagem }, status);
  }
});
