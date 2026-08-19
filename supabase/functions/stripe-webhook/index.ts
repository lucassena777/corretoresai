// Webhook do Stripe: é quem libera (e tira) o plano pago.
//
// Esta função é a única coisa no sistema que pode escrever `plano` na tabela
// profiles — o banco revoga essa coluna do usuário justamente para que ninguém
// se dê um plano sozinho. Por isso ela roda com a service role.
//
// Ela precisa ser publicada com verify_jwt = false: quem chama é o Stripe, que
// não tem token do Supabase. A autenticação aqui é a assinatura do próprio
// Stripe, conferida abaixo — sem ela, qualquer um liberaria plano com um POST.

const COTAS: Record<string, number> = {
  gratuito: 5,
  pro: 40,
  ilimitado: 999999,
};

const hex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

// Comparação em tempo constante: comparar assinatura com === vaza informação
// pelo tempo de resposta.
function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let n = 0; n < a.length; n++) diferenca |= a.charCodeAt(n) ^ b.charCodeAt(n);
  return diferenca === 0;
}

// Assinatura do Stripe: "t=<timestamp>,v1=<hmac>", onde o hmac é
// HMAC-SHA256("<timestamp>.<corpo cru>") com o segredo do endpoint.
async function assinaturaConfere(corpoCru: string, cabecalho: string, segredo: string) {
  const partes = Object.fromEntries(
    cabecalho.split(",").map((p) => p.split("=").map((s) => s.trim()) as [string, string]),
  );
  const t = partes.t;
  const v1 = partes.v1;
  if (!t || !v1) return false;

  // Recusa evento velho demais: barra reenvio de uma requisição capturada.
  const idade = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(idade) || idade > 300) return false;

  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const esperado = hex(await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(`${t}.${corpoCru}`)));
  return iguais(esperado, v1);
}

async function gravarPlano(uid: string, plano: string) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const servico = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const resposta = await fetch(`${url}/rest/v1/profiles?id=eq.${uid}`, {
    method: "PATCH",
    headers: {
      apikey: servico,
      authorization: `Bearer ${servico}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({
      plano,
      cota_limite: COTAS[plano] ?? COTAS.gratuito,
      cota_usada: 0,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!resposta.ok) {
    throw new Error(`Não deu para gravar o plano: ${resposta.status} ${await resposta.text()}`);
  }
}

async function gravarAssinatura(uid: string, dados: Record<string, unknown>) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const servico = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  await fetch(`${url}/rest/v1/subscriptions`, {
    method: "POST",
    headers: {
      apikey: servico,
      authorization: `Bearer ${servico}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ user_id: uid, ...dados, updated_at: new Date().toISOString() }),
  }).catch((e) => console.error("[webhook] assinatura não registrada:", e.message));
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Use POST.", { status: 405 });

  const segredo = (Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "").trim();
  if (!segredo) {
    console.error("[webhook] falta STRIPE_WEBHOOK_SECRET");
    return new Response("Webhook não configurado.", { status: 503 });
  }

  const cabecalho = req.headers.get("stripe-signature");
  const corpoCru = await req.text();

  if (!cabecalho || !(await assinaturaConfere(corpoCru, cabecalho, segredo))) {
    // Sem assinatura válida não se olha o conteúdo: seria aceitar plano pago
    // da mão de qualquer um.
    return new Response("Assinatura inválida.", { status: 400 });
  }

  const evento = JSON.parse(corpoCru);
  const objeto = evento.data?.object ?? {};

  try {
    switch (evento.type) {
      case "checkout.session.completed": {
        const uid = objeto.client_reference_id || objeto.metadata?.user_id;
        const plano = objeto.metadata?.plano;
        if (!uid || !plano) {
          console.error("[webhook] sessão sem carimbo de usuário/plano:", objeto.id);
          break;
        }
        // Assinatura só vale quando o pagamento realmente saiu.
        if (objeto.payment_status && objeto.payment_status !== "paid") {
          console.log("[webhook] sessão concluída sem pagamento:", objeto.payment_status);
          break;
        }

        await gravarPlano(uid, plano);
        await gravarAssinatura(uid, {
          plan: plano,
          status: "active",
          stripe_customer_id: objeto.customer ?? null,
          stripe_subscription_id: objeto.subscription ?? null,
        });
        console.log(`[webhook] ${uid} agora é ${plano}`);
        break;
      }

      // Renovou, mudou de plano, ficou em atraso: o Stripe manda o estado novo.
      case "customer.subscription.updated": {
        const uid = objeto.metadata?.user_id;
        const plano = objeto.metadata?.plano;
        if (!uid) break;

        const ativa = objeto.status === "active" || objeto.status === "trialing";
        await gravarPlano(uid, ativa && plano ? plano : "gratuito");
        await gravarAssinatura(uid, {
          plan: ativa && plano ? plano : "gratuito",
          status: objeto.status,
          stripe_subscription_id: objeto.id,
          cancel_at_period_end: Boolean(objeto.cancel_at_period_end),
          current_period_end: objeto.current_period_end
            ? new Date(objeto.current_period_end * 1000).toISOString()
            : null,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const uid = objeto.metadata?.user_id;
        if (!uid) break;
        await gravarPlano(uid, "gratuito");
        await gravarAssinatura(uid, { plan: "gratuito", status: "canceled", stripe_subscription_id: objeto.id });
        console.log(`[webhook] ${uid} voltou para o gratuito`);
        break;
      }

      default:
        // Evento que não muda plano: responder 200 evita reenvio infinito.
        break;
    }
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e);
    console.error("[webhook]", evento.type, mensagem);
    // 500 faz o Stripe tentar de novo — é o que se quer quando o banco falhou.
    return new Response(mensagem, { status: 500 });
  }

  return new Response(JSON.stringify({ recebido: true }), {
    headers: { "content-type": "application/json" },
  });
});
