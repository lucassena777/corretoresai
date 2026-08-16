// Base de conhecimento do assistente.
//
// Não é um banco vetorial: é recuperação por palavra-chave, no navegador. Para
// o tamanho desta base (algumas dezenas de verbetes) isso basta e não custa
// nada — nenhuma chamada extra, nenhuma latência antes da resposta.
//
// O fluxo é o de um RAG simples: a pergunta entra, buscar() pontua os verbetes
// por termo em comum, e os melhores viajam junto com a pergunta para o modelo,
// dentro do system prompt. Assim o assistente responde sobre a plataforma com
// o texto certo na mão, em vez de deduzir como o site funciona.
//
// Três trilhas:
//   plataforma  — como usar cada ferramenta do CorretoresAI
//   mercado     — legislação, negociação, copy, tendências, abordagem
//   criacao     — e-mail, legenda, reunião presencial, resposta a objeção

const conhecimento = (() => {

  const BASE = [
    /* ---------------- Documentação da plataforma ---------------- */
    {
      id: "central",
      trilha: "plataforma",
      titulo: "Central de Conteúdo",
      termos: "central conteudo gerar geracao ideia ideias roteiro briefing funil formato area angulo aprovar rascunho",
      texto: `A Central é onde nasce o conteúdo. O corretor escolhe a área de atuação, descreve o imóvel em texto livre, informa cidade ou região, o estágio do funil (Topo, Meio, Fundo ou Personalizado) e o formato (Reels, Carrossel, Stories ou TikTok).
Cada geração devolve TRÊS ideias sobre o mesmo imóvel, em ângulos diferentes: Análise e valorização, Estilo de vida e funcionalidade, e Oportunidade e decisão. Cada ideia vem com os 11 campos do roteiro: título, gancho, desenvolvimento, prova, chamada, legenda pronta, hashtags, objetivo, público, nota de formato e orientação de gravação.
O que estiver escrito no briefing entra no roteiro: metragem, dormitórios, suítes, vagas, andar, valor e diferenciais são reconhecidos automaticamente. Acentuação e capitalização são corrigidas — "sao paulo higienopolis" vira "São Paulo - Higienópolis".
Em cada ideia: "Aprovar e agendar" cria o conteúdo já com data no Calendário e no Kanban; "Salvar rascunho" manda para a Biblioteca; "Ver roteiro completo" abre o editor dos 11 campos.`
    },
    {
      id: "calendario",
      trilha: "plataforma",
      titulo: "Calendário Editorial",
      termos: "calendario editorial data agendar agendamento mes dia arrastar reagendar planejamento",
      texto: `O Calendário Editorial mostra o mês inteiro com os conteúdos já posicionados na data. Arrastar um card de um dia para outro reagenda — não precisa abrir nada. Clicar no número de um dia abre a Central já com aquela data escolhida.
O Kanban não fica no menu lateral: ele é uma ABA dentro do Calendário Editorial, porque as duas visões olham para o mesmo acervo, só que por eixos diferentes (data x etapa).
Toda mudança de data vira uma linha no Histórico.`
    },
    {
      id: "kanban",
      trilha: "plataforma",
      titulo: "Kanban de produção",
      termos: "kanban coluna status aprovado agendado publicado producao mover fluxo etapa",
      texto: `O Kanban fica na aba "Kanban", dentro do Calendário Editorial. Colunas: Aprovado, Agendado e Publicado.
Arrastar um card entre colunas muda o status do conteúdo e registra a movimentação no Histórico. Serve para enxergar o gargalo: muita coisa parada em Aprovado significa conteúdo aprovado que ninguém agendou.`
    },
    {
      id: "biblioteca",
      trilha: "plataforma",
      titulo: "Biblioteca",
      termos: "biblioteca acervo buscar busca filtro filtrar tag ordenar rascunho arquivo procurar",
      texto: `A Biblioteca é o acervo completo, incluindo rascunhos. Tem busca por título, tag ou área, mais filtros de área, formato e status, e ordenação.
Clicar em qualquer card abre o editor completo, com os 11 campos do roteiro, data, horário, status e tags. Dá para regerar o roteiro, copiar tudo para a área de transferência, duplicar e excluir.`
    },
    {
      id: "historico",
      trilha: "plataforma",
      titulo: "Histórico",
      termos: "historico atividade atividades log linha do tempo registro auditoria",
      texto: `O Histórico é a linha do tempo da conta: cada criação, edição, mudança de data e movimento de card vira uma linha com tempo relativo. As últimas atividades também aparecem resumidas no Dashboard.`
    },
    {
      id: "dashboard",
      trilha: "plataforma",
      titulo: "Dashboard",
      termos: "dashboard painel metrica metricas numeros visualizacoes leads proximos resumo inicio",
      texto: `O Dashboard resume a operação: conteúdos no acervo, próximos posts agendados, atividades recentes e métricas. Visualizações e leads são estimativas derivadas do número de conteúdos publicados — servem de termômetro de ritmo, não de relatório de rede social.`
    },
    {
      id: "perfil",
      trilha: "plataforma",
      titulo: "Perfil do corretor",
      termos: "perfil creci nome imobiliaria bio tom de voz assinatura avatar cidade areas",
      texto: `O Perfil alimenta o resto da plataforma: o nome vira as iniciais do avatar e assina as legendas, a cidade vira o padrão da Central, as áreas de atuação orientam as sugestões e o tom de voz entra na orientação de gravação de cada roteiro e no jeito do assistente responder.
Preencher o perfil melhora diretamente a qualidade do texto gerado — é o insumo mais barato que existe aqui.`
    },
    {
      id: "planos",
      trilha: "plataforma",
      titulo: "Planos e cota de gerações",
      termos: "plano planos preco preços cota geracoes gratuito pro ilimitado upgrade assinatura valor mensal",
      texto: `São três planos. Gratuito: R$ 0, com 5 gerações para experimentar. Corretor Pro: R$ 39,90 por mês, com 40 gerações. Ilimitado: R$ 59,90 por mês, sem trava de geração.
Uma "geração" é um clique em Gerar — e cada clique devolve três ideias completas, não uma. A cota aparece no topo da Central e na barra lateral. Trocar de plano zera o contador.`
    },
    {
      id: "configuracoes",
      trilha: "plataforma",
      titulo: "Configurações e conta",
      termos: "configuracoes ajustes padrao tema claro escuro senha excluir conta dados json exportar restaurar",
      texto: `Em Configurações ficam os padrões da Central (área, funil, formato e horário), a opção de agendar automaticamente ao aprovar, o tema e os dados da conta.
O tema alterna entre escuro (preto e dourado, o padrão) e claro pelo botão de sol no topo — a escolha fica salva. Também dá para copiar todos os seus dados em JSON, restaurar o acervo de exemplo ou excluir a conta.
As contas ficam neste navegador: e-mail e senha (com hash) no armazenamento local da máquina. Serve para testar o fluxo inteiro; ainda não sincroniza entre dispositivos.`
    },

    /* ---------------- Base imobiliária ---------------- */
    {
      id: "objecao-preco",
      trilha: "mercado",
      titulo: "Objeção de preço alto",
      termos: "objecao objecoes preco caro alto desconto negociar valor achei caro abaixar barganha",
      texto: `"Está caro" quase nunca é sobre o número. É sobre uma destas três coisas: falta de referência (não sabe o que é caro naquela região), medo de errar, ou o valor não caber no plano financeiro dele.
Antes de defender o preço, descubra qual das três é. Uma pergunta resolve: "Caro comparado com o quê?" — a resposta separa quem viu outra unidade mais barata (comparação) de quem só tem receio (percepção).
Nunca desconte antes de justificar. Ancore em: valor por metro quadrado das últimas negociações comparáveis, custo mensal real (condomínio + IPTU), e liquidez do endereço. Se o cliente pede desconto sem contrapartida, ofereça condição em vez de preço: prazo, forma de pagamento, o que fica no imóvel.
Fechamento honesto: "Se eu conseguir esse valor com o proprietário, você fecha hoje?" Sem essa pergunta, o desconto vira só um novo ponto de partida para a próxima pedida.`
    },
    {
      id: "objecoes-gerais",
      trilha: "mercado",
      titulo: "Objeções comuns e como responder",
      termos: "objecao objecoes pensar vou pensar esposa marido pesquisando so olhando esperando juros cair",
      texto: `"Vou pensar" — quase sempre falta informação, não tempo. Pergunte: "O que ainda precisa ficar claro para você decidir?" e trate o item que aparecer.
"Estou só pesquisando" — ótimo cliente, errado o momento. Não empurre visita: ofereça critério ("posso te mandar como comparar duas unidades da mesma rua?") e fique presente até ele amadurecer.
"Preciso falar com meu/minha companheiro(a)" — o decisor não está na conversa. Traga a outra pessoa para a próxima: "Faz sentido marcarmos os três juntos?"
"Vou esperar os juros caírem" — mostre a conta dos dois lados: juro menor costuma vir com preço maior, e a parcela pode não melhorar. Compare o custo total, não só a taxa.
"Achei outro mais barato" — compare fichas lado a lado. Metragem útil, andar, posição solar, vaga, idade da construção e condomínio explicam a diferença na maioria das vezes.`
    },
    {
      id: "creci-legal",
      trilha: "mercado",
      titulo: "CRECI, contrato e documentação",
      termos: "creci legal juridico juridica lei legislacao contrato matricula itbi escritura cartorio comissao exclusividade documentacao onus",
      texto: `O corretor precisa de CRECI ativo para intermediar e deve identificá-lo em anúncio e material. Intermediação sem registro é irregular.
Antes de qualquer proposta, cheque: matrícula atualizada do imóvel (é ali que aparecem ônus, penhora, usufruto e o real proprietário), certidões do vendedor, situação do condomínio (dívida de condomínio acompanha o imóvel) e IPTU.
Na compra entram ITBI (pago pelo comprador, alíquota municipal) e o registro em cartório — sem registro, não há transferência de propriedade, contrato assinado não basta.
A comissão se deve quando o corretor aproxima as partes e o negócio se conclui; contrato de exclusividade e o percentual devem estar por escrito.
Isso é orientação geral: caso concreto com inventário, usucapião, imóvel em construção ou litígio pede advogado, e questão tributária pede contador.`
    },
    {
      id: "financiamento",
      trilha: "mercado",
      titulo: "Financiamento e viabilidade",
      termos: "financiamento credito fgts entrada parcela banco aprovacao aprovado renda score simulacao sac price",
      texto: `Cliente com crédito pré-aprovado negocia de outro lugar. Encaminhe a aprovação ANTES da visita sempre que der.
O que trava aprovação, na prática: renda comprometida acima do limite do banco, restrição no nome, tempo de registro em carteira, imóvel com pendência na matrícula ou avaliação do banco abaixo do valor negociado.
FGTS pode entrar na entrada, na amortização ou na redução de parcela, com regras próprias (imóvel residencial urbano, na cidade onde mora ou trabalha, sem outro financiamento ativo no SFH).
SAC começa com parcela maior e cai ao longo do tempo; Price mantém a parcela. Cliente com orçamento apertado hoje costuma preferir Price, quem quer pagar menos juros no total tende ao SAC.
Confirme sempre a regra vigente com o banco antes de prometer.`
    },
    {
      id: "abordagem",
      trilha: "mercado",
      titulo: "Abordagem e qualificação de cliente",
      termos: "abordagem abordar cliente lead qualificar qualificacao primeiro contato whatsapp resposta rapida follow up prospeccao",
      texto: `Velocidade vence conteúdo: responder em minutos muda a taxa de conversão mais do que qualquer script.
Na primeira conversa, descubra quatro coisas sem parecer interrogatório: para que serve o imóvel (morar, investir, alugar), prazo, forma de pagamento e quem decide junto.
Não mande catálogo. Mande UMA opção certa com o porquê dela — "separei este por causa do metrô a pé e da vaga coberta, que foram os seus dois pontos".
Follow-up não é insistência: é entregar algo novo a cada contato (uma unidade nova, um dado de mercado, um cenário de financiamento). Sem novidade, vira cobrança.
Alto padrão exige o oposto de pressa: discrição, poucos imóveis, muita curadoria e disponibilidade fora do horário comercial.`
    },
    {
      id: "copy",
      trilha: "mercado",
      titulo: "Copy de alta conversão para imóveis",
      termos: "copy copywriting texto anuncio legenda gancho cta chamada headline titulo persuasao escrever vender",
      texto: `A estrutura que funciona: gancho (3 primeiros segundos), tensão (o problema real de quem procura), demonstração (o imóvel resolvendo), prova (dado, comparação ou critério) e chamada.
O gancho tem que dizer algo que só quem conhece a região diria. "Apartamento novo em Higienópolis" não é gancho; "dois apartamentos iguais nesta rua, R$ 200 mil de diferença — e não é pela metragem" é.
Fale de consequência, não de característica: não é "varanda gourmet", é "o almoço de domingo deixa de ser na sala".
Números específicos ganham de adjetivos. "47 m² bem distribuídos" convence mais que "aconchegante e charmoso".
CTA de relacionamento converte melhor que CTA de pressa: "envie uma mensagem para receber a análise completa" rende mais que "corre que vai acabar".
Evite: caixa alta gritada, emoji em excesso, "imperdível", "oportunidade única" e qualquer promessa de valorização garantida — além de queimar autoridade, promessa de rentabilidade é terreno perigoso.`
    },
    {
      id: "funil",
      trilha: "mercado",
      titulo: "Funil de conteúdo e estratégia de postagem",
      termos: "funil topo meio fundo estrategia postagem frequencia calendario semana lancamento campanha alcance autoridade",
      texto: `Topo: alcança quem ainda não procura. Assunto é a região e o mercado, não o seu imóvel. É o que constrói autoridade.
Meio: quem já compara. Critério, comparação, erro comum, como avaliar. É onde você vira referência.
Fundo: quem já decidiu. Imóvel específico, condição, documentação, chamada direta para visita.
Proporção que sustenta ritmo sem cansar a audiência: cerca de metade topo, um terço meio, o resto fundo.
Para lançamento, funciona uma escada de duas a três semanas: primeiro a região (por que ali), depois o produto (planta, diferenciais, comparação), depois condição e prazo. Quem só posta fundo vira classificado; quem só posta topo nunca vende.
Constância vence volume: três posts por semana por seis meses rende mais que trinta num mês e silêncio depois.`
    },
    {
      id: "mercado",
      trilha: "mercado",
      titulo: "Leitura de mercado e valorização",
      termos: "mercado valorizacao metro quadrado liquidez tendencia investimento aluguel rentabilidade regiao bairro avaliacao precificacao",
      texto: `O que sustenta preço numa região: infraestrutura consolidada, oferta limitada de terreno, transporte, comércio a pé, escola e segurança percebida. O que derruba: excesso de lançamentos simultâneos, mudança de zoneamento e degradação do entorno.
Liquidez importa mais que valorização projetada. Imóvel que vende rápido protege o comprador; imóvel barato que ninguém quer não é oportunidade.
Para precificar, compare três unidades semelhantes na mesma região — mesma faixa de metragem, andar e idade — e olhe o valor por metro quadrado de negócios FECHADOS, não de anúncios. Anúncio é pedida, não é preço.
Sinais de imóvel mal precificado: mais de 90 dias anunciado sem proposta, ou visitas demais sem retorno.
Nunca prometa percentual de valorização futura. Explique o mecanismo e deixe o cliente concluir.`
    },

    /* ---------------- Apoio à criação, fora da Central ---------------- */
    {
      id: "email",
      trilha: "criacao",
      titulo: "E-mail para cliente",
      termos: "email e-mail mensagem formal proposta enviar escrever carta apresentacao assunto",
      texto: `E-mail de corretor tem que caber na tela do celular. Estrutura: assunto específico (o imóvel ou a decisão, nunca "Proposta"), uma linha de contexto lembrando de onde vocês se conhecem, o núcleo (proposta, imóvel ou resumo da visita), o que você precisa da pessoa e um fechamento com data.
Para envio de proposta: valor, forma de pagamento, prazo de validade e o que está incluso — por escrito, sem adjetivo. Anexe a ficha e a matrícula quando fizer sentido.
Para retomar contato frio: traga um fato novo daquela região, não um "passando para saber se ainda tem interesse".
Assine com nome, CRECI e telefone. Um único pedido por e-mail; dois pedidos viram nenhum.`
    },
    {
      id: "reuniao",
      trilha: "criacao",
      titulo: "Reunião presencial e visita",
      termos: "reuniao presencial visita roteiro apresentacao encontro atendimento tour cliente pauta",
      texto: `Roteiro de visita que funciona: chegue antes, abra as janelas e acenda as luzes; comece pelo ambiente mais forte e termine no segundo mais forte (o meio da visita é onde a atenção cai); fale menos que o cliente; e cale-se nos silêncios — é neles que ele se imagina morando ali.
Leve impressa a ficha com metragem, condomínio, IPTU e o valor. Cliente que sai sem número esfria no caminho de casa.
Feche a visita com uma pergunta de temperatura, não de pressão: "de zero a dez, onde este entrou na sua lista?" — e trate o que faltou para chegar a dez.
Em reunião de captação com proprietário, a pauta é: expectativa de preço, prazo, motivação da venda, documentação em dia e exclusividade. Leve o comparativo da região; discussão de preço sem dado vira queda de braço.`
    },
    {
      id: "legenda",
      trilha: "criacao",
      titulo: "Legenda e post personalizado",
      termos: "legenda post instagram publicacao hashtag stories reels carrossel texto personalizado",
      texto: `A legenda começa onde o vídeo parou: não repita o gancho, avance o argumento.
Formato que funciona: primeira linha forte (é o que aparece antes do "mais"), três a cinco linhas de corpo com quebras, uma chamada e a assinatura com nome e CRECI.
Hashtags: de cinco a sete, minúsculas e sem acento, misturando região, tipo de imóvel e categoria profissional. Trinta hashtags genéricas não entregam mais; entregam menos.
Para conteúdo de bairro, cite ponto de referência real — quem mora ali reconhece e comenta, e comentário de morador é o que espalha o post na região.`
    },
    {
      id: "assistente-uso",
      trilha: "plataforma",
      titulo: "Como usar o assistente",
      termos: "assistente copiloto chat ajuda como usar voce pode perguntar duvida suporte",
      texto: `O assistente fica no canto esquerdo, disponível em qualquer tela da área logada. Ele conhece a plataforma inteira e o mercado imobiliário, e enxerga o perfil do corretor (cidade, áreas de atuação, tom de voz) — por isso a resposta sai ajustada à região de quem pergunta.
Serve para o que a Central não faz: e-mail para cliente, resposta a objeção, roteiro de reunião presencial, estratégia de postagem, dúvida sobre documentação e sobre a própria plataforma.
Cada resposta tem botão de copiar. A conversa fica salva neste navegador e o botão da lixeira começa do zero.`
    }
  ];

  const PARAR = new Set([
    "para", "com", "como", "uma", "que", "dos", "das", "por", "sobre", "meu", "minha",
    "sua", "seu", "the", "and", "voce", "vc", "qual", "quais", "quero", "preciso",
    "pode", "poderia", "fazer", "faz", "mais", "melhor", "isso", "aqui", "esta",
    "este", "essa", "esse", "tem", "the", "num", "nao", "sim", "ele", "ela"
  ]);

  const normalizar = (s) => texto.semAcento(String(s || "")).toLowerCase();

  const palavras = (s) => normalizar(s)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 2 && !PARAR.has(p));

  // Pontua cada verbete pela pergunta e devolve os melhores. Título e termos
  // valem mais que o corpo: quem escreve "kanban" quer o verbete do Kanban,
  // não o da Central que menciona a palavra de passagem.
  function buscar(pergunta, quantos = 3) {
    const termos = [...new Set(palavras(pergunta))];
    if (!termos.length) return [];

    const pontuados = BASE.map((verbete) => {
      const alvoForte = normalizar(`${verbete.titulo} ${verbete.termos}`);
      const alvoCorpo = normalizar(verbete.texto);

      let pontos = 0;
      for (const termo of termos) {
        if (alvoForte.includes(termo)) pontos += 3;
        else if (alvoCorpo.includes(termo)) pontos += 1;
        // Radical: "financiamento" casa com "financiar", "negociacao" com "negociar".
        else if (termo.length > 5 && alvoForte.includes(termo.slice(0, 5))) pontos += 2;
      }
      return { verbete, pontos };
    });

    return pontuados
      .filter((p) => p.pontos >= 3)
      .sort((a, b) => b.pontos - a.pontos)
      .slice(0, quantos)
      .map((p) => p.verbete);
  }

  // O que vai dentro do system prompt, já formatado.
  function contexto(pergunta) {
    const achados = buscar(pergunta);
    if (!achados.length) return null;

    return {
      fontes: achados.map((v) => v.titulo),
      texto: achados
        .map((v) => `## ${v.titulo} (${v.trilha})\n${v.texto}`)
        .join("\n\n")
    };
  }

  return { buscar, contexto, BASE };
})();
