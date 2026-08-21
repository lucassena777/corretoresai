// Engine de conteúdo. Recebe o briefing tratado e devolve os 11 campos.
//
// São três ângulos com propósitos diferentes, para que as três ideias de uma
// mesma geração nunca digam a mesma coisa:
//   analise     — dinâmica do bairro, infraestrutura e metragem
//   estilo      — como o espaço resolve a rotina de quem vai morar
//   decisao     — números de mercado, documentação e momento de compra

const roteiro = (() => {

  const ANGULOS = ["analise", "estilo", "decisao"];

  // Escolha estável: mesma semente, mesmo texto; sementes diferentes, textos
  // diferentes. Evita a sensação de frase repetida a cada geração.
  const pick = (lista, semente) => lista[Math.abs(Math.trunc(semente)) % lista.length];

  /* ---------------- Títulos ---------------- */

  const TITULOS = {
    analise: {
      Topo: [
        "{Lugar}: o que sustenta o metro quadrado por aqui",
        "O que faz um endereço em {Lugar} valer o que vale",
        "{Lugar} sob análise: infraestrutura, metragem e liquidez"
      ],
      Meio: [
        "{Ficha} em {Lugar}: como comparar sem se enganar",
        "Metragem, planta e endereço: a conta real em {Lugar}",
        "O que separa dois imóveis parecidos em {Lugar}"
      ],
      Fundo: [
        "Análise completa: {Ficha} em {Lugar}",
        "{Lugar}: por que este imóvel se sustenta no preço",
        "O laudo honesto deste {Tipo} em {Lugar}"
      ],
      Personalizado: [
        "{Lugar}: leitura de mercado para quem decide com dado",
        "Um panorama técnico de {Lugar} antes da sua escolha"
      ]
    },
    estilo: {
      Topo: [
        "Morar em {Lugar} sem abrir mão de funcionalidade",
        "A rotina que um bom endereço em {Lugar} devolve para você",
        "{Lugar}: quando a localização economiza o seu dia"
      ],
      Meio: [
        "{Ficha} bem resolvidos: a planta que muda a rotina",
        "Planta inteligente em {Lugar}: o que olhar de verdade",
        "Espaço útil x espaço no papel em {Lugar}"
      ],
      Fundo: [
        "Um dia inteiro neste {Tipo} em {Lugar}",
        "{Ficha} em {Lugar}: veja como o espaço funciona na prática",
        "A planta deste {Tipo} em {Lugar}, cômodo por cômodo"
      ],
      Personalizado: [
        "{Lugar} do jeito que você vive: recorte sob medida",
        "O encaixe entre a sua rotina e um endereço em {Lugar}"
      ]
    },
    decisao: {
      Topo: [
        "O que o mercado de {Lugar} está dizendo neste momento",
        "Três indicadores que explicam {Lugar} hoje",
        "{Lugar}: o cenário antes de qualquer decisão"
      ],
      Meio: [
        "Antes de assinar em {Lugar}: documentação e viabilidade",
        "{Lugar}: como saber se o momento é seu",
        "Segurança jurídica e timing na compra em {Lugar}"
      ],
      Fundo: [
        "{Ficha} em {Lugar}: condições, prazo e próximos passos",
        "Este {Tipo} em {Lugar} está pronto para proposta",
        "{Lugar}: o que já está resolvido neste negócio"
      ],
      Personalizado: [
        "{Lugar}: viabilidade sob medida para o seu caso",
        "Sua decisão em {Lugar}, com os números na mesa"
      ]
    }
  };

  /* ---------------- Ganchos (0–3s) ---------------- */

  const GANCHOS = {
    analise: [
      "{Lugar} exige um olhar atento para metragem e localização estratégica — e é aí que a maioria erra a conta.",
      "Antes de discutir preço em {Lugar}, é preciso entender o que sustenta o metro quadrado ali.",
      "Dois imóveis com a mesma metragem em {Lugar} podem ter valores muito diferentes. E o motivo raramente está no anúncio."
    ],
    estilo: [
      "Planta inteligente não é sobre tamanho: é sobre quantas decisões ela resolve por você todos os dias.",
      "Em {Lugar}, o que muda a rotina não é o número no anúncio — é a distância entre a porta e o que você usa.",
      "Existe uma diferença silenciosa entre um imóvel bonito e um imóvel que funciona. Ela aparece na segunda semana."
    ],
    decisao: [
      "Decisão de compra madura se apoia em três frentes: número, documentação e prazo.",
      "Quando o cliente me pergunta se é hora de comprar em {Lugar}, eu abro a planilha antes de responder.",
      "Oportunidade real não é desconto: é imóvel certo, documentação limpa e condição que cabe no seu plano."
    ]
  };

  /* ---------------- Desenvolvimento ---------------- */

  const DESENVOLVIMENTO = {
    analise: (c) => [
      `${c.sujeitoLugar} concentra três coisas que o mercado cobra caro: infraestrutura consolidada, oferta limitada de terreno e vizinhança estável.`,
      c.fichaFrase
        ? `Neste caso são ${c.fichaFrase} — e essa metragem, nessa região, atende quem quer bem localizado sem carregar área ociosa.`
        : `Nessa faixa de metragem, o que decide é a eficiência da planta: área útil real, circulação curta e aproveitamento de cada parede.`,
      c.extras
        ? `Some a isso ${c.extras}, que ${c.extrasVerbo} na comparação com unidades semelhantes.`
        : `Prédio, idade da construção e padrão de manutenção entram na conta tanto quanto o endereço.`,
      "Quem compara só o valor total ignora o que realmente sustenta o preço: liquidez, custo mensal e o que a região oferece a pé."
    ],
    estilo: (c) => [
      c.fichaFrase
        ? `São ${c.fichaFrase}, distribuídos para funcionar de manhã cedo e no fim da tarde — que é quando a casa é mais exigida.`
        : `A planta foi pensada para funcionar de manhã cedo e no fim da tarde, que é quando a casa é mais exigida.`,
      `Em ${c.lugarCurto}, você resolve mercado, farmácia e transporte sem entrar no carro. Isso volta como tempo livre no fim do mês.`,
      c.extras
        ? `${c.extrasCapitalizado} ${c.extrasMuda} o uso do espaço na prática, não só na descrição.`
        : `Cada ambiente aqui tem função definida — nada de metro quadrado que só aparece na planta.`,
      "É o tipo de imóvel que você entende visitando, porque a diferença está no uso, não na foto."
    ],
    decisao: (c) => [
      `${c.sujeitoLugar} tem histórico de liquidez consistente, o que reduz risco para quem compra pensando em prazo médio.`,
      c.valor
        ? `A condição atual é ${c.valor}, com espaço para estruturar entrada e financiamento de forma realista.`
        : `A condição pode ser estruturada entre entrada e financiamento — o desenho certo depende do seu momento, não de uma tabela pronta.`,
      "Documentação, matrícula e situação do condomínio eu verifico antes de sentar para negociar. Você recebe tudo checado.",
      "O objetivo não é apressar decisão: é chegar na proposta com todas as respostas prontas."
    ]
  };

  /* ---------------- Prova (20–35s) ---------------- */

  const PROVAS = {
    analise: [
      "Na última janela de doze meses, unidades bem localizadas nessa faixa mantiveram tempo de venda abaixo da média da cidade.",
      "Endereço consolidado costuma sustentar preço mesmo em ciclo de queda — é o que separa imóvel de investimento de imóvel de impulso.",
      "Comparo sempre três unidades semelhantes na mesma região antes de dizer se o preço faz sentido."
    ],
    estilo: [
      "Quem sai de um imóvel maior e mal distribuído para um menor e bem resolvido raramente quer voltar atrás.",
      "A conta que quase ninguém faz: quanto do seu mês volta quando o trajeto diário some.",
      "Área útil bem desenhada rende mais no dia a dia do que metro quadrado espalhado."
    ],
    decisao: [
      "Antes de qualquer proposta, eu verifico matrícula, ônus, situação do condomínio e histórico de reformas.",
      "Financiamento aprovado antes da visita muda a sua posição na negociação — e isso vale mais que qualquer desconto pedido na hora.",
      "Negócio bem feito é o que continua parecendo bom três anos depois."
    ]
  };

  /* ---------------- CTA ---------------- */

  const CTAS = {
    analise: [
      "Envie uma mensagem para receber a análise completa deste imóvel.",
      "Me chame para receber o comparativo com outras unidades da região.",
      "Peça o estudo de metragem e valor por metro quadrado deste endereço."
    ],
    estilo: [
      "Me chame para uma visita guiada, com calma e sem roteiro de vendedor.",
      "Envie uma mensagem e eu mando o tour em vídeo, ambiente por ambiente.",
      "Se fizer sentido para a sua rotina, agendo a visita no seu horário."
    ],
    decisao: [
      "Agende uma conversa e receba a análise de viabilidade antes de qualquer proposta.",
      "Me chame para montarmos o desenho de entrada e financiamento no seu ritmo.",
      "Envie uma mensagem para receber a checagem de documentação deste imóvel."
    ]
  };

  /* ---------------- Objetivo e público ---------------- */

  const OBJETIVOS = {
    Topo: "Alcançar quem ainda não começou a procurar, gerando autoridade na região",
    Meio: "Convencer quem já está comparando opções e precisa de critério",
    Fundo: "Converter quem está decidido em visita agendada",
    Personalizado: "Campanha sob medida, com o recorte que você definir"
  };

  const PUBLICOS = {
    analise: "Comprador analítico, que pesquisa valor por metro quadrado antes de visitar",
    estilo: "Quem vai morar no imóvel e decide pela rotina que ele permite",
    decisao: "Comprador em fase final, com crédito encaminhado e prazo definido"
  };

  /* ---------------- Formato ---------------- */

  const FORMATOS_NOTA = {
    Reels: "Reels de 45s — corte a cada 3 segundos, legenda queimada e áudio limpo",
    TikTok: "TikTok de 40s — comece falando, sem vinheta, e mantenha o ritmo alto",
    Stories: "Sequência de 4 stories — um argumento por tela, com enquete no terceiro",
    Carrossel: "Carrossel de 6 lâminas — capa com o gancho, uma ideia por lâmina, CTA no final"
  };

  const GRAVACAO = {
    Reels: "Grave na hora dourada, comece já dentro do imóvel e evite plano parado por mais de 4 segundos.",
    TikTok: "Fale direto para a câmera na abertura, use plano de mão e mostre o ambiente enquanto explica.",
    Stories: "Grave na vertical, com você aparecendo na primeira tela para dar rosto ao argumento.",
    Carrossel: "Fotografe com luz natural, uma foto por lâmina, e reserve a última para a chamada."
  };

  /* ---------------- Montagem ---------------- */

  function contexto(dados, perfil) {
    const local = texto.local(dados.city || dados.cidade || "", perfil?.cidade || "");
    const fatos = texto.fatos(dados.briefing);
    const fichaFrase = texto.ficha(fatos);
    const extras = texto.lista(fatos.caracteristicas.slice(0, 3));

    const qtdExtras = fatos.caracteristicas.slice(0, 3).length;

    return {
      local,
      fatos,
      fichaFrase,
      extras,
      extrasCapitalizado: extras ? extras.charAt(0).toUpperCase() + extras.slice(1) : "",
      // "pesa" para um diferencial, "pesam" para dois ou mais.
      extrasVerbo: qtdExtras > 1 ? "pesam" : "pesa",
      extrasMuda: qtdExtras > 1 ? "mudam" : "muda",
      valor: fatos.valor,
      lugarCurto: local.curto || "sua região",
      // Como sujeito da frase, o aposto precisa fechar com vírgula.
      sujeitoLugar: local.bairro && local.cidade
        ? `${local.bairro}, em ${local.cidade},`
        : (local.curto || "A sua região"),
      tipo: (dados.area || "Imóveis").replace(/s$/, "").toLowerCase()
    };
  }

  function preencher(modelo, c) {
    const texto = modelo
      .replace(/\{Lugar\}/g, c.local.curto || "sua região")
      .replace(/\{Ficha\}/g, c.fichaFrase || "a metragem certa")
      .replace(/\{Tipo\}/g, c.tipo);

    // Os campos entram em minúscula ("47 m², 2 dormitórios"), e alguns modelos
    // começam por eles — sem isto o título nasce com inicial minúscula.
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  // Monta um roteiro completo (os 11 campos) para um ângulo.
  function montar(dados, perfil, angulo, semente = 0) {
    const c = contexto(dados, perfil);
    const funil = dados.funnel || "Topo";
    const formato = dados.format || "Reels";
    const s = Math.trunc(semente);

    const titulos = TITULOS[angulo][funil] || TITULOS[angulo].Topo;
    const titulo = dados.title || preencher(pick(titulos, s), c);
    const gancho = preencher(pick(GANCHOS[angulo], s + 1), c);
    const cta = pick(CTAS[angulo], s + 2);
    const prova = pick(PROVAS[angulo], s + 3);

    const blocos = DESENVOLVIMENTO[angulo](c).filter(Boolean);

    const assinatura = [perfil?.nome, perfil?.creci].filter(Boolean).join(" · ");
    const legenda = [
      gancho,
      "",
      blocos[1],
      "",
      cta,
      assinatura ? `\n${assinatura}` : ""
    ].filter((l) => l !== undefined).join("\n").trim();

    const tags = [
      texto.hashtag(c.tipo),
      c.local.tag ? `#${c.local.tag}` : "",
      texto.hashtag(formato),
      "#corretordeimoveis",
      "#mercadoimobiliario",
      angulo === "decisao" ? "#investimento" : angulo === "estilo" ? "#morarbem" : "#analisedemercado"
    ].filter(Boolean);

    return {
      titulo,
      gancho,
      desenvolvimento: blocos.slice(0, 2).join("\n\n"),
      prova: [blocos[2], prova].filter(Boolean).join("\n\n"),
      cta,
      legenda,
      hashtags: tags.join(" "),
      objetivo: OBJETIVOS[funil] || OBJETIVOS.Topo,
      publico: `${PUBLICOS[angulo]}, buscando ${c.tipo} em ${c.lugarCurto}`,
      formatoNota: FORMATOS_NOTA[formato] || FORMATOS_NOTA.Reels,
      gravacao: perfil?.tom
        ? `${GRAVACAO[formato] || GRAVACAO.Reels} Tom de voz: ${perfil.tom}`
        : (GRAVACAO[formato] || GRAVACAO.Reels)
    };
  }

  // As três ideias de uma geração: ângulos diferentes, textos diferentes.
  function gerarIdeias(dados, perfil, semente = Date.now()) {
    const c = contexto(dados, perfil);
    const briefingLimpo = texto.frase(dados.briefing);

    return ANGULOS.map((angulo, n) => {
      const base = {
        ...dados,
        title: undefined,
        briefing: briefingLimpo,
        city: c.local.completo,
        tags: [
          dados.area,
          angulo === "analise" ? "Análise" : angulo === "estilo" ? "Estilo de vida" : "Decisão",
          dados.format
        ].filter(Boolean)
      };

      const script = montar(base, perfil, angulo, semente + n * 17);

      return {
        ...base,
        angulo,
        rotulo: ROTULOS[angulo],
        title: script.titulo,
        script,
        origem: "local"
      };
    });
  }

  /* ---------------- Geração pela IA de verdade ---------------- */
  //
  // Mesmo formato de saída de gerarIdeias(), só que o texto vem do modelo em
  // vez dos modelos de frase daqui. O briefing é enviado já tratado pelo
  // texto.js — a IA recebe "São Paulo - Higienópolis", nunca "sao paulo".
  //
  // Quem chama deve tratar a exceção e cair no gerarIdeias() local: sem chave
  // configurada, sem internet ou com o back-end fora do ar, o site continua
  // gerando.

  const ROTULOS = {
    analise: "Análise e valorização",
    estilo: "Estilo de vida e funcionalidade",
    decisao: "Oportunidade e decisão"
  };

  const CAMPOS = [
    "titulo", "gancho", "desenvolvimento", "prova", "cta",
    "legenda", "hashtags", "objetivo", "publico", "formatoNota", "gravacao"
  ];

  async function gerarIdeiasIA(dados, perfil, { timeoutMs = 90000 } = {}) {
    if (typeof CONFIG === "undefined" || !CONFIG.assistenteUrl || !CONFIG.assistenteChave) {
      throw new Error("O back-end de IA ainda não está configurado.");
    }

    const c = contexto(dados, perfil);
    const briefingLimpo = texto.frase(dados.briefing);

    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), timeoutMs);

    let corpo;
    try {
      const resposta = await fetch(CONFIG.assistenteUrl, {
        method: "POST",
        signal: controle.signal,
        headers: CONFIG.cabecalhos(),
        body: JSON.stringify({
          modo: "roteiro",
          contexto: {
            nome: perfil?.nome, creci: perfil?.creci, cidade: perfil?.cidade,
            imobiliaria: perfil?.imobiliaria, areas: perfil?.areas,
            bio: perfil?.bio, tom: perfil?.tom
          },
          briefing: {
            area: dados.area,
            local: c.local.completo || "não informado",
            funil: dados.funnel || "Topo",
            formato: dados.format || "Reels",
            ficha: c.fichaFrase,
            valor: c.valor,
            caracteristicas: c.extras,
            descricao: briefingLimpo
          }
        })
      });

      if (!resposta.ok) throw await CONFIG.erroDaResposta(resposta);

      corpo = await resposta.json();
    } catch (e) {
      // Falha de rede vira explicação; erro que já veio do servidor passa reto.
      throw e instanceof TypeError || e.name === "AbortError"
        ? new Error(CONFIG.diagnosticar(e))
        : e;
    } finally {
      clearTimeout(relogio);
    }

    const vindas = Array.isArray(corpo.ideias) ? corpo.ideias : [];
    if (!vindas.length) throw new Error("O back-end não devolveu nenhuma ideia.");

    const ideias = ANGULOS.map((angulo, n) => {
      const bruta = vindas.find((i) => i.angulo === angulo) ?? vindas[n] ?? {};

      const base = {
        ...dados,
        title: undefined,
        briefing: briefingLimpo,
        city: c.local.completo,
        tags: (Array.isArray(bruta.tags) && bruta.tags.length ? bruta.tags : [
          dados.area,
          angulo === "analise" ? "Análise" : angulo === "estilo" ? "Estilo de vida" : "Decisão",
          dados.format
        ]).filter(Boolean).slice(0, 4)
      };

      // Campo que o modelo deixou vazio volta para o texto local, para que o
      // roteiro nunca chegue incompleto no editor.
      const local = montar(base, perfil, angulo, hashTexto(c.local.completo + angulo));
      const script = {};
      for (const campo of CAMPOS) {
        const valor = typeof bruta[campo] === "string" ? bruta[campo].trim() : "";
        script[campo] = valor || local[campo];
      }

      return {
        ...base,
        angulo,
        rotulo: ROTULOS[angulo],
        title: script.titulo,
        script,
        origem: "ia"
      };
    });

    // `cotaUsada` vem do servidor, que é quem de fato cobra — e cobra só
    // quando a geração deu certo. Devolver junto é o que permite à tela parar
    // de contar por conta própria e mostrar o número verdadeiro.
    return { ideias, cotaUsada: corpo.cotaUsada };
  }

  return { gerarIdeias, gerarIdeiasIA, montar, ANGULOS };
})();

// Compatibilidade: itens antigos e do acervo de exemplo continuam com roteiro.
function buildScript(item, perfil) {
  const angulo = roteiro.ANGULOS[Math.abs(hashTexto(item.id || item.title)) % 3];
  return roteiro.montar(item, perfil, angulo, hashTexto(item.title));
}

function hashTexto(s) {
  let h = 0;
  for (const ch of String(s || "")) h = (h * 31 + ch.codePointAt(0)) | 0;
  return h;
}
