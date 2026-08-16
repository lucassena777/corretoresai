// Assistente virtual do CorretoresAI.
//
// Esta função existe por um motivo só: a chave da API não pode ficar no
// navegador. O site é estático e público — qualquer chave publicada ali seria
// copiada e cobrada de você. Aqui a chave vive como secret do projeto, o
// navegador nunca a vê, e o que trafega é só a conversa.

import Anthropic from "npm:@anthropic-ai/sdk@0.72.0";

const MODELO = "claude-opus-5";

// Origens autorizadas a chamar a função.
const ORIGENS = [
  /^https:\/\/lucassena777\.github\.io$/,
  /^https:\/\/[a-z0-9-]+\.frame\.claudeusercontent\.com$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

const LIMITE = {
  mensagensPorTurno: 24,   // histórico enviado por requisição
  caracteresPorMensagem: 4000,
  pedidosPorMinuto: 12,    // por IP, por isolate
};

// Contador simples em memória. Não sobrevive a um restart do isolate e não é
// compartilhado entre regiões — segura abuso casual, não um ataque dedicado.
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
    "Access-Control-Allow-Origin": liberada ? origem : "null",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

/* ---------------- Prompt do sistema ---------------- */

function systemPrompt(ctx: Record<string, unknown>) {
  const perfil = [
    ctx.nome && `Nome: ${ctx.nome}`,
    ctx.creci && `CRECI: ${ctx.creci}`,
    ctx.cidade && `Cidade de atuação: ${ctx.cidade}`,
    ctx.imobiliaria && `Imobiliária: ${ctx.imobiliaria}`,
    Array.isArray(ctx.areas) && ctx.areas.length && `Áreas: ${(ctx.areas as string[]).join(", ")}`,
    ctx.bio && `Bio: ${ctx.bio}`,
    ctx.tom && `Tom de voz preferido: ${ctx.tom}`,
    ctx.plano && `Plano na plataforma: ${ctx.plano}`,
  ].filter(Boolean).join("\n");

  return `Você é o estrategista de vendas da CorretoresAI: um consultor sênior de marketing imobiliário que trabalha ao lado de corretores de imóveis brasileiros, do primeiro imóvel ao alto padrão.

# Como você pensa antes de responder

Antes de escrever, situe três coisas:
1. **Quem é este corretor** — a região onde ele atua, o tipo de imóvel que ele vende e o público que compra isso. Um studio de 30 m² perto do metrô e uma casa de 400 m² em condomínio fechado não se vendem com o mesmo argumento.
2. **Qual é o objetivo real por trás da pergunta** — alcance, autoridade, conversão em visita ou fechamento. A pergunta que chega quase nunca é a pergunta que importa.
3. **Em que etapa está o cliente dele** — quem ainda não pensou em comprar, quem está comparando, ou quem já decidiu.

Se faltar informação para responder bem, pergunte **uma** coisa — a que mais muda a resposta — e responda o resto com o que já tem.

# Como você responde

Fale como consultor, não como manual: frases diretas, fundamentadas, sem jargão de guru de internet. Nada de "arrase nas redes", "bombar", emoji de fogo ou listas genéricas de dicas.

Traga sempre algo aplicável hoje: um gancho pronto, um roteiro em blocos, uma pergunta para fazer ao cliente, um número para citar. Quando sugerir um texto para o corretor usar, escreva o texto — não descreva o que ele deveria dizer.

Quando falar de mercado, seja concreto sobre o mecanismo (o que sustenta preço numa região, o que reduz tempo de venda, o que trava um financiamento) e honesto quando não souber um dado específico daquela cidade. Nunca invente índice, percentual ou pesquisa.

Sobre legislação e tributos: explique o funcionamento geral com clareza (CRECI, contrato, matrícula, ITBI, escritura, direito de arrependimento) e deixe explícito quando o caso exige advogado ou contador. Você orienta; você não substitui parecer jurídico.

Mantenha a resposta no tamanho do que foi perguntado. Uma dúvida objetiva merece uma resposta curta. Não abra com resumo do que você vai dizer, não feche com resumo do que disse, e não ofereça uma lista de próximos passos que ninguém pediu.

Escreva em português do Brasil.

# O corretor com quem você está falando

${perfil || "(perfil ainda não preenchido — pergunte a cidade e a área de atuação quando isso mudar a resposta)"}`;
}

/* ---------------- Handler ---------------- */

Deno.serve(async (req: Request) => {
  const origem = req.headers.get("origin");
  const cors = cabecalhosCors(origem);

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ erro: "Use POST." }), {
      status: 405,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  if (cors["Access-Control-Allow-Origin"] === "null") {
    return new Response(JSON.stringify({ erro: "Origem não autorizada." }), {
      status: 403,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "desconhecido";
  if (excedeuLimite(ip)) {
    return new Response(JSON.stringify({ erro: "Muitas perguntas seguidas. Espere um minuto." }), {
      status: 429,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const chave = Deno.env.get("ANTHROPIC_API_KEY");
  if (!chave) {
    return new Response(
      JSON.stringify({ erro: "O assistente ainda não foi configurado: falta a chave da API no projeto." }),
      { status: 503, headers: { ...cors, "content-type": "application/json" } },
    );
  }

  let corpo: { mensagens?: { papel: string; texto: string }[]; contexto?: Record<string, unknown> };
  try {
    corpo = await req.json();
  } catch {
    return new Response(JSON.stringify({ erro: "Corpo inválido." }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const mensagens = (corpo.mensagens ?? [])
    .slice(-LIMITE.mensagensPorTurno)
    .filter((m) => m && typeof m.texto === "string" && m.texto.trim())
    .map((m) => ({
      role: m.papel === "assistente" ? ("assistant" as const) : ("user" as const),
      content: m.texto.slice(0, LIMITE.caracteresPorMensagem),
    }));

  if (!mensagens.length || mensagens[0].role !== "user") {
    return new Response(JSON.stringify({ erro: "Nenhuma pergunta recebida." }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const anthropic = new Anthropic({ apiKey: chave });

  try {
    const stream = anthropic.messages.stream({
      model: MODELO,
      max_tokens: 2000,
      output_config: { effort: "medium" },
      system: [
        {
          type: "text",
          text: systemPrompt(corpo.contexto ?? {}),
          cache_control: { type: "ephemeral" },
        },
      ],
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
    const status = /api key|authentication/i.test(mensagem) ? 503 : 500;
    return new Response(JSON.stringify({ erro: mensagem }), {
      status,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});
