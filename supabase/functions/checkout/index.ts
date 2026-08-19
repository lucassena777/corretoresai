// Abre a sessão de pagamento do Stripe para o corretor logado.
//
// Por que existe uma função no meio: a chave secreta do Stripe não pode ficar
// no navegador, e o plano precisa ser amarrado ao usuário certo. Aqui a gente
// confere o token do Supabase, descobre quem é, e só então cria a sessão com o
// id dele carimbado — o webhook usa esse carimbo para liberar o plano.
//
// Os IDs configurados são de PRODUTO (prod_...). O Checkout precisa de PREÇO
// (price_...), então a função procura o preço ativo do produto na hora. Assim
// dá para trocar o valor no painel do Stripe sem mexer no código.

const PRODUTOS: Record<string, string> = {
  pro: "prod_V6TICRMgwFz3YO",
  ilimitado: "prod_V6TJwWKzsWvFjD",
};

const SITE = "https://lucassena777.github.io/corretoresai";

const ORIGENS = [
  /^https:\/\/lucassena777\.github\.io$/,
  /^https:\/\/[a-z0-9-]+\.frame\.claudeusercontent\.com$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

function cors(origem: string | null) {
  return {
    "Access-Control-Allow-Origin": origem || "*",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// A API do Stripe é form-encoded, inclusive para campos aninhados.
function form(dados: Record<string, string>) {
  return new URLSearchParams(dados).toString();
}

async function stripe(caminho: string, chave: string, corpo?: Record<string, string>) {
  const resposta = await fetch(`https://api.stripe.com/v1/${caminho}`, {
    method: corpo ? "POST" : "GET",
    headers: {
      "authorization": `Bearer ${chave}`,
      ...(corpo ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body: corpo ? form(corpo) : undefined,
  });

  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(dados?.error?.message ?? `Stripe respondeu ${resposta.status}.`);
  }
  return dados;
}

Deno.serve(async (req: Request) => {
  const origem = req.headers.get("origin");
  const cabecalhos = cors(origem);
  const json = (dados: unknown, status = 200) =>
    new Response(JSON.stringify(dados), {
      status,
      headers: { ...cabecalhos, "content-type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: cabecalhos });
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);
  if (!origem || !ORIGENS.some((re) => re.test(origem))) {
    return json({ erro: `Origem não autorizada: ${origem ?? "(sem origem)"}` }, 403);
  }

  const chaveStripe = (Deno.env.get("STRIPE_SECRET_KEY") ?? "").trim();
  if (!chaveStripe) {
    return json({
      erro: "O pagamento ainda não foi ligado: falta o secret STRIPE_SECRET_KEY " +
            "no Supabase (Project Settings → Edge Functions → Secrets). " +
            "Nenhuma mudança no site resolve isso — a chave só pode ser colada lá.",
    }, 503);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Quem está pedindo? O token do Supabase é a única fonte disso — o navegador
  // não escolhe por quem paga.
  const autorizacao = req.headers.get("authorization") ?? "";
  const token = autorizacao.replace(/^Bearer\s+/i, "");
  if (!token) return json({ erro: "Faça login para assinar." }, 401);

  const usuarioResposta = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anon, authorization: `Bearer ${token}` },
  });
  if (!usuarioResposta.ok) return json({ erro: "Sessão expirada. Entre de novo." }, 401);

  const usuario = await usuarioResposta.json();

  let corpo: { plano?: string };
  try {
    corpo = await req.json();
  } catch {
    return json({ erro: "Corpo inválido." }, 400);
  }

  const plano = corpo.plano ?? "";
  const produto = PRODUTOS[plano];
  if (!produto) return json({ erro: `Plano desconhecido: ${plano}` }, 400);

  try {
    // Preço ativo e recorrente do produto. Se houver mais de um, o primeiro.
    const precos = await stripe(`prices?product=${produto}&active=true&limit=10`, chaveStripe);
    const preco = (precos.data ?? []).find((p: { recurring?: unknown }) => p.recurring) ?? precos.data?.[0];

    if (!preco) {
      return json({
        erro: `O produto ${produto} não tem preço ativo no Stripe. Crie um preço recorrente para ele.`,
      }, 400);
    }

    const sessao = await stripe("checkout/sessions", chaveStripe, {
      "mode": "subscription",
      "line_items[0][price]": preco.id,
      "line_items[0][quantity]": "1",
      "customer_email": usuario.email,
      // Os dois carimbos que o webhook usa para saber quem pagou o quê.
      "client_reference_id": usuario.id,
      "metadata[user_id]": usuario.id,
      "metadata[plano]": plano,
      "subscription_data[metadata][user_id]": usuario.id,
      "subscription_data[metadata][plano]": plano,
      "success_url": `${SITE}/app/planos.html?pagamento=ok`,
      "cancel_url": `${SITE}/app/planos.html?pagamento=cancelado`,
      "allow_promotion_codes": "true",
      "locale": "pt-BR",
    });

    return json({ url: sessao.url });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Erro inesperado.";
    console.error("[checkout]", mensagem);
    return json({ erro: mensagem }, 502);
  }
});
