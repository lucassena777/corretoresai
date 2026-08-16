// Back-end de IA do CorretoresAI. Dois modos, uma chave:
//
//   modo "chat"     — o assistente virtual da área logada (resposta em streaming)
//   modo "roteiro"  — a Central de Conteúdo (3 ideias com os 11 campos, em JSON)
//
// A função existe por um motivo só: a chave da API não pode ficar no navegador.
// O site é estático e público — qualquer chave publicada ali seria copiada e
// cobrada de você. Aqui ela vive como secret do projeto e nunca sai daqui.

import Anthropic from "@anthropic-ai/sdk";

const MODELO = "claude-opus-5";

const ORIGENS = [
  /^https:\/\/lucassena777\.github\.io$/,
  /^https:\/\/[a-z0-9-]+\.frame\.claudeusercontent\.com$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

const LIMITE = {
  mensagensPorTurno: 24,
  caracteresPorMensagem: 4000,
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

function cabecalhosCors(origem: string | null) {
  const liberada = origem && ORIGENS.some((re) => re.test(origem));
  return {
    "Access-Control-Allow-Origin": liberada ? origem! : "null",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
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

const PERSONA = `Você é o estrategista de vendas da CorretoresAI: um consultor sênior de marketing imobiliário que trabalha ao lado de corretores de imóveis brasileiros, do primeiro imóvel ao alto padrão.

Fale como consultor, não como manual: frases diretas, fundamentadas, sem jargão de guru de internet. Nada de "arrase nas redes", "bombar", emoji de fogo ou listas genéricas de dicas.

Quando falar de mercado, seja concreto sobre o mecanismo (o que sustenta preço numa região, o que reduz tempo de venda, o que trava um financiamento) e honesto quando não souber um dado específico daquela cidade. Nunca invente índice, percentual ou pesquisa — se citar um número, ele tem que vir do briefing.

Escreva em português do Brasil, com acentuação e pontuação corretas.`;

/* ---------------- Modo chat ---------------- */

function systemChat(ctx: Record<string, unknown>) {
  const perfil = perfilEmTexto(ctx);
  return `${PERSONA}

# Como você pensa antes de responder

Antes de escrever, situe três coisas:
1. **Quem é este corretor** — a região onde ele atua, o tipo de imóvel que ele vende e o público que compra isso. Um studio de 30 m² perto do metrô e uma casa de 400 m² em condomínio fechado não se vendem com o mesmo argumento.
2. **Qual é o objetivo real por trás da pergunta** — alcance, autoridade, conversão em visita ou fechamento. A pergunta que chega quase nunca é a pergunta que importa.
3. **Em que etapa está o cliente dele** — quem ainda não pensou em comprar, quem está comparando, ou quem já decidiu.

Se faltar informação para responder bem, pergunte **uma** coisa — a que mais muda a resposta — e responda o resto com o que já tem.

# Como você responde

Traga sempre algo aplicável hoje: um gancho pronto, um roteiro em blocos, uma pergunta para fazer ao cliente. Quando sugerir um texto para o corretor usar, escreva o texto — não descreva o que ele deveria dizer.

Sobre legislação e tributos: explique o funcionamento geral com clareza (CRECI, contrato, matrícula, ITBI, escritura, direito de arrependimento) e deixe explícito quando o caso exige advogado ou contador. Você orienta; você não substitui parecer jurídico.

Mantenha a resposta no tamanho do que foi perguntado. Uma dúvida objetiva merece uma resposta curta. Não abra com resumo do que você vai dizer, não feche com resumo do que disse, e não ofereça uma lista de próximos passos que ninguém pediu.

# O corretor com quem você está falando

${perfil || "(perfil ainda não preenchido — pergunte a cidade e a área de atuação quando isso mudar a resposta)"}`;
}

/* ---------------- Modo roteiro ---------------- */

const CAMPOS = [
  "titulo", "gancho", "desenvolvimento", "prova", "cta",
  "legenda", "hashtags", "objetivo", "publico", "formatoNota", "gravacao",
];

const ESQUEMA = {
  type: "object",
  properties: {
    ideias: {
      type: "array",
      items: {
        type: "object",
        properties: {
          angulo: { type: "string", enum: ["analise", "estilo", "decisao"] },
          titulo: { type: "string" },
          gancho: { type: "string" },
          desenvolvimento: { type: "string" },
          prova: { type: "string" },
          cta: { type: "string" },
          legenda: { type: "string" },
          hashtags: { type: "string" },
          objetivo: { type: "string" },
          publico: { type: "string" },
          formatoNota: { type: "string" },
          gravacao: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["angulo", ...CAMPOS, "tags"],
        additionalProperties: false,
      },
    },
  },
  required: ["ideias"],
  additionalProperties: false,
};

function systemRoteiro(ctx: Record<string, unknown>) {
  const perfil = perfilEmTexto(ctx);
  return `${PERSONA}

# Sua tarefa

Você escreve roteiros de conteúdo para redes sociais a partir de um briefing de imóvel. Devolva **exatamente três ideias**, uma de cada ângulo, nesta ordem:

1. **analise** — Análise e valorização. A dinâmica do bairro, a infraestrutura em volta, o que sustenta o metro quadrado ali, como a metragem do imóvel se compara com o que a região oferece.
2. **estilo** — Estilo de vida e funcionalidade. Como a planta e a localização resolvem a rotina de quem vai morar. Concreto sobre o dia a dia, não adjetivo solto.
3. **decisao** — Oportunidade e decisão. Números de mercado, documentação, segurança jurídica e por que este é o momento (ou não é) de fechar.

As três ideias falam do mesmo imóvel e não podem se repetir: título, gancho, chamada e argumento têm que ser diferentes entre elas.

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
  if (cors["Access-Control-Allow-Origin"] === "null") return json({ erro: "Origem não autorizada." }, 403);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "desconhecido";
  if (excedeuLimite(ip)) return json({ erro: "Muitas requisições seguidas. Espere um minuto." }, 429);

  const chave = Deno.env.get("ANTHROPIC_API_KEY");
  if (!chave) {
    return json({ erro: "A IA ainda não foi configurada: falta a chave da API no projeto." }, 503);
  }

  let corpo: {
    modo?: string;
    mensagens?: { papel: string; texto: string }[];
    briefing?: Record<string, unknown>;
    contexto?: Record<string, unknown>;
  };
  try {
    corpo = await req.json();
  } catch {
    return json({ erro: "Corpo inválido." }, 400);
  }

  const anthropic = new Anthropic({ apiKey: chave });
  const contexto = corpo.contexto ?? {};

  /* ----- Roteiro: resposta única em JSON ----- */

  if (corpo.modo === "roteiro") {
    try {
      const resposta = await anthropic.messages.create({
        model: MODELO,
        max_tokens: 8000,
        output_config: {
          effort: "medium",
          format: { type: "json_schema", schema: ESQUEMA },
        },
        system: [{ type: "text", text: systemRoteiro(contexto), cache_control: { type: "ephemeral" } }],
        messages: [{
          role: "user",
          content: `Escreva as três ideias para este briefing:\n\n${briefingEmTexto(corpo.briefing ?? {})}`,
        }],
      });

      if (resposta.stop_reason === "refusal") {
        return json({ erro: "O modelo recusou este briefing. Tente reescrevê-lo." }, 422);
      }

      const bloco = resposta.content.find((b) => b.type === "text");
      if (!bloco || bloco.type !== "text") return json({ erro: "Resposta vazia do modelo." }, 502);

      const dados = JSON.parse(bloco.text);
      return json({ ideias: (dados.ideias ?? []).slice(0, 3) });
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Erro inesperado.";
      return json({ erro: mensagem }, /api key|authentication/i.test(mensagem) ? 503 : 500);
    }
  }

  /* ----- Chat: streaming ----- */

  const mensagens = (corpo.mensagens ?? [])
    .slice(-LIMITE.mensagensPorTurno)
    .filter((m) => m && typeof m.texto === "string" && m.texto.trim())
    .map((m) => ({
      role: m.papel === "assistente" ? ("assistant" as const) : ("user" as const),
      content: m.texto.slice(0, LIMITE.caracteresPorMensagem),
    }));

  if (!mensagens.length || mensagens[0].role !== "user") {
    return json({ erro: "Nenhuma pergunta recebida." }, 400);
  }

  try {
    const stream = anthropic.messages.stream({
      model: MODELO,
      max_tokens: 2000,
      output_config: { effort: "medium" },
      system: [{ type: "text", text: systemChat(contexto), cache_control: { type: "ephemeral" } }],
      messages: mensagens,
    });

    const encoder = new TextEncoder();
    const sse = new ReadableStream({
      async start(controller) {
        const enviar = (evento: string, dados: unknown) =>
          controller.enqueue(encoder.encode(`event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`));

        try {
          for await (const texto of stream.textStream) enviar("texto", texto);
          const final = await stream.finalMessage();
          enviar("fim", { motivo: final.stop_reason });
        } catch (e) {
          enviar("erro", { mensagem: e instanceof Error ? e.message : "Falha ao gerar a resposta." });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(sse, {
      headers: {
        ...cors,
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        "connection": "keep-alive",
      },
    });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Erro inesperado.";
    return json({ erro: mensagem }, /api key|authentication/i.test(mensagem) ? 503 : 500);
  }
});
