// Tratamento de texto: acentuação, capitalização e leitura dos fatos do briefing.
// Tudo o que o corretor digita passa por aqui antes de entrar em um roteiro.

const texto = (() => {

  // Palavras que ficam em minúscula no meio de um nome próprio.
  const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "no", "na", "em"]);

  const UFS = new Set(["ac", "al", "ap", "am", "ba", "ce", "df", "es", "go", "ma", "mt",
    "ms", "mg", "pa", "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc", "sp",
    "se", "to"]);

  // Nomes de lugar por forma sem acento. Cobre capitais, cidades grandes e
  // bairros que aparecem com frequência em anúncio.
  const LUGARES = {
    "sao paulo": "São Paulo", "sp": "SP", "rio de janeiro": "Rio de Janeiro",
    "belo horizonte": "Belo Horizonte", "brasilia": "Brasília", "salvador": "Salvador",
    "fortaleza": "Fortaleza", "curitiba": "Curitiba", "recife": "Recife",
    "porto alegre": "Porto Alegre", "goiania": "Goiânia", "belem": "Belém",
    "manaus": "Manaus", "vitoria": "Vitória", "florianopolis": "Florianópolis",
    "natal": "Natal", "joao pessoa": "João Pessoa", "maceio": "Maceió",
    "teresina": "Teresina", "sao luis": "São Luís", "cuiaba": "Cuiabá",
    "campo grande": "Campo Grande", "aracaju": "Aracaju", "macapa": "Macapá",
    "boa vista": "Boa Vista", "porto velho": "Porto Velho", "rio branco": "Rio Branco",
    "palmas": "Palmas", "campinas": "Campinas", "santos": "Santos",
    "sao bernardo do campo": "São Bernardo do Campo", "santo andre": "Santo André",
    "sao caetano do sul": "São Caetano do Sul", "guarulhos": "Guarulhos",
    "osasco": "Osasco", "barueri": "Barueri", "sorocaba": "Sorocaba",
    "ribeirao preto": "Ribeirão Preto", "sao jose dos campos": "São José dos Campos",
    "jundiai": "Jundiaí", "atibaia": "Atibaia", "braganca paulista": "Bragança Paulista",
    "niteroi": "Niterói", "petropolis": "Petrópolis", "uberlandia": "Uberlândia",
    "juiz de fora": "Juiz de Fora", "londrina": "Londrina", "maringa": "Maringá",
    "joinville": "Joinville", "blumenau": "Blumenau", "caxias do sul": "Caxias do Sul",

    // Bairros
    "higienopolis": "Higienópolis", "jardins": "Jardins", "jardim paulista": "Jardim Paulista",
    "jardim america": "Jardim América", "jardim europa": "Jardim Europa",
    "vila nova conceicao": "Vila Nova Conceição", "vila olimpia": "Vila Olímpia",
    "vila madalena": "Vila Madalena", "vila mariana": "Vila Mariana",
    "itaim bibi": "Itaim Bibi", "moema": "Moema", "perdizes": "Perdizes",
    "pinheiros": "Pinheiros", "consolacao": "Consolação", "bela vista": "Bela Vista",
    "santa cecilia": "Santa Cecília", "pacaembu": "Pacaembu", "brooklin": "Brooklin",
    "campo belo": "Campo Belo", "morumbi": "Morumbi", "alto de pinheiros": "Alto de Pinheiros",
    "tatuape": "Tatuapé", "mooca": "Mooca", "ipiranga": "Ipiranga", "santana": "Santana",
    "aclimacao": "Aclimação", "paraiso": "Paraíso", "cerqueira cesar": "Cerqueira César",
    "ipanema": "Ipanema", "leblon": "Leblon", "copacabana": "Copacabana",
    "botafogo": "Botafogo", "flamengo": "Flamengo", "barra da tijuca": "Barra da Tijuca",
    "laranjeiras": "Laranjeiras", "tijuca": "Tijuca", "lagoa": "Lagoa",
    "savassi": "Savassi", "lourdes": "Lourdes", "funcionarios": "Funcionários",
    "meireles": "Meireles", "boa viagem": "Boa Viagem", "batel": "Batel",
    "moinhos de vento": "Moinhos de Vento", "cambui": "Cambuí"
  };

  // Vocabulário imobiliário sem acento -> forma correta.
  const TERMOS = {
    "imovel": "imóvel", "imoveis": "imóveis", "area": "área", "areas": "áreas",
    "util": "útil", "uteis": "úteis", "proximo": "próximo", "proxima": "próxima",
    "condominio": "condomínio", "condominios": "condomínios", "edificio": "edifício",
    "edificios": "edifícios", "predio": "prédio", "predios": "prédios",
    "suite": "suíte", "suites": "suítes", "sacada": "sacada", "terraco": "terraço",
    "deposito": "depósito", "dormitorio": "dormitório", "dormitorios": "dormitórios",
    "seguranca": "segurança", "valorizacao": "valorização", "localizacao": "localização",
    "servicos": "serviços", "comercio": "comércio", "otimo": "ótimo", "otima": "ótima",
    "unico": "único", "unica": "única", "publico": "público", "publica": "pública",
    "garagem": "garagem", "mobilia": "mobília", "elevadores": "elevadores",
    "portaria": "portaria", "academia": "academia", "varanda": "varanda",
    "documentacao": "documentação", "avaliacao": "avaliação", "negociacao": "negociação",
    "financiamento": "financiamento", "escritura": "escritura", "reformado": "reformado",
    "andar": "andar", "quintal": "quintal", "jardim": "jardim", "piscina": "piscina",
    "cozinha": "cozinha", "banheiro": "banheiro", "sala": "sala", "quarto": "quarto",
    "opcao": "opção", "opcoes": "opções", "regiao": "região", "regioes": "regiões",
    "padrao": "padrão", "sao": "São", "tres": "três", "voce": "você", "ja": "já",
    "so": "só", "esta": "está", "ate": "até", "aluguel": "aluguel", "e": "e"
  };

  // Remove os sinais diacríticos que o NFD separa (faixa combining marks).
  const semAcento = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const chave = (s) => semAcento(String(s).toLowerCase()).replace(/\s+/g, " ").trim();

  function capitalizar(palavra, primeira) {
    const base = palavra.toLowerCase();
    if (UFS.has(base) && base.length === 2) return base.toUpperCase();
    if (!primeira && MINUSCULAS.has(base)) return base;
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  // "sao paulo higienopolis" -> { cidade: "São Paulo", bairro: "Higienópolis" }
  function local(entrada, cidadePadrao = "") {
    const bruto = String(entrada || "").replace(/\s+/g, " ").trim();
    if (!bruto) return montarLocal(cidadePadrao, "");

    // Separadores explícitos primeiro: vírgula, hífen, barra, "em".
    const partes = bruto.split(/\s*[,\-–\/|]\s*/).filter(Boolean);
    if (partes.length >= 2) {
      return montarLocal(nomeProprio(partes[0]), nomeProprio(partes.slice(1).join(" ")));
    }

    // Sem separador: procura a cidade conhecida mais longa no começo ou no fim.
    const palavras = bruto.split(" ");
    for (let n = Math.min(4, palavras.length); n >= 1; n--) {
      const inicio = chave(palavras.slice(0, n).join(" "));
      if (LUGARES[inicio] && n < palavras.length) {
        return montarLocal(LUGARES[inicio], nomeProprio(palavras.slice(n).join(" ")));
      }
      const fim = chave(palavras.slice(palavras.length - n).join(" "));
      if (LUGARES[fim] && n < palavras.length) {
        return montarLocal(LUGARES[fim], nomeProprio(palavras.slice(0, palavras.length - n).join(" ")));
      }
    }

    // Uma coisa só: é bairro se a cidade do perfil já for conhecida.
    const unico = nomeProprio(bruto);
    return cidadePadrao && chave(cidadePadrao) !== chave(unico)
      ? montarLocal(nomeProprio(cidadePadrao), unico)
      : montarLocal(unico, "");
  }

  function montarLocal(cidade, bairro) {
    const c = cidade || "";
    const b = bairro || "";
    return {
      cidade: c,
      bairro: b,
      completo: b ? `${c} - ${b}` : c,
      curto: b || c,
      // Para usar dentro de frase: "Higienópolis, em São Paulo".
      contexto: b && c ? `${b}, em ${c}` : (b || c),
      tag: semAcento((b || c).toLowerCase()).replace(/[^a-z0-9]/g, "")
    };
  }

  // Nome próprio: aplica o dicionário e capitaliza o resto.
  function nomeProprio(entrada) {
    const bruto = String(entrada || "").replace(/\s+/g, " ").trim();
    if (!bruto) return "";

    const inteiro = LUGARES[chave(bruto)];
    if (inteiro) return inteiro;

    return bruto.split(" ").map((palavra, i) => {
      const k = chave(palavra);
      if (LUGARES[k]) return LUGARES[k];
      if (TERMOS[k] && TERMOS[k] !== k) return capitalizar(TERMOS[k], i === 0);
      return capitalizar(palavra, i === 0);
    }).join(" ");
  }

  // Corrige acentuação e pontuação de um texto corrido (o briefing).
  function frase(entrada) {
    let t = String(entrada || "").replace(/\s+/g, " ").trim();
    if (!t) return "";

    t = t.replace(/\s+([,.;:!?])/g, "$1").replace(/([,;:])(?=\S)/g, "$1 ");

    t = t.split(" ").map((palavra) => {
      const nucleo = palavra.replace(/^[^\wÀ-ÿ]+|[^\wÀ-ÿ]+$/g, "");
      if (!nucleo) return palavra;
      const k = chave(nucleo);

      // "metro quadrado" não vira "metrô quadrado".
      if (k === "metro") return palavra;
      if (!TERMOS[k] || TERMOS[k] === k) return palavra;

      const corrigido = nucleo[0] === nucleo[0].toUpperCase()
        ? TERMOS[k].charAt(0).toUpperCase() + TERMOS[k].slice(1)
        : TERMOS[k];
      return palavra.replace(nucleo, corrigido);
    }).join(" ");

    // Maiúscula no começo e depois de ponto final.
    t = t.charAt(0).toUpperCase() + t.slice(1);
    t = t.replace(/([.!?])\s+([a-zà-ÿ])/g, (_, p, l) => `${p} ${l.toUpperCase()}`);

    if (!/[.!?…]$/.test(t)) t += ".";
    return t;
  }

  // Lê números e características do briefing para o roteiro citar fatos reais.
  function fatos(briefing) {
    const t = String(briefing || "").toLowerCase();
    const num = (re) => {
      const m = t.match(re);
      return m ? m[1].replace(",", ".") : null;
    };

    const metragem = num(/(\d+[.,]?\d*)\s*(?:m²|m2|metros quadrados|metros)/);
    const quartos = num(/(\d+)\s*(?:quartos?|dormit[óo]rios?|dorms?)/);
    const suites = num(/(\d+)\s*su[ií]tes?/);
    const vagas = num(/(\d+)\s*vagas?/);
    const andar = num(/(\d+)\s*[ºo°]?\s*andar/);

    const valorMatch = t.match(/r\$\s*([\d.,]+)\s*(mil|milh(?:ão|ões|ao|oes))?/);
    const valor = valorMatch
      ? `R$ ${valorMatch[1]}${valorMatch[2] ? " " + valorMatch[2] : ""}`
      : null;

    const CARACTERISTICAS = [
      [/varanda gourmet/, "varanda gourmet"], [/sacada/, "sacada"],
      [/churrasqueira/, "churrasqueira"], [/piscina/, "piscina"],
      [/academia/, "academia no condomínio"], [/portaria\s*24/, "portaria 24 horas"],
      [/metr[oô]/, "metrô a pé"], [/mobiliad/, "mobiliado"],
      [/reformad/, "reformado"], [/vista livre|vista permanente/, "vista livre"],
      [/pet/, "aceita pet"], [/coworking/, "coworking"],
      [/elevador privativo/, "elevador privativo"], [/planta reta/, "planta reta"],
      [/marcenaria/, "marcenaria planejada"], [/lazer completo/, "lazer completo"],
      [/alto padr[aã]o/, "acabamento de alto padrão"]
    ];

    const caracteristicas = CARACTERISTICAS.filter(([re]) => re.test(t)).map(([, nome]) => nome);

    return {
      metragem: metragem ? `${metragem.replace(".0", "")} m²` : null,
      quartos, suites, vagas, andar, valor, caracteristicas,
      temAlgo: Boolean(metragem || quartos || suites || vagas || valor || caracteristicas.length)
    };
  }

  // "47 m², 2 dormitórios e 1 vaga" — só com o que existe.
  function ficha(f) {
    const partes = [];
    if (f.metragem) partes.push(f.metragem);
    if (f.quartos) partes.push(`${f.quartos} ${f.quartos === "1" ? "dormitório" : "dormitórios"}`);
    if (f.suites) partes.push(`${f.suites} ${f.suites === "1" ? "suíte" : "suítes"}`);
    if (f.vagas) partes.push(`${f.vagas} ${f.vagas === "1" ? "vaga" : "vagas"}`);
    if (f.andar) partes.push(`${f.andar}º andar`);
    if (!partes.length) return "";
    return partes.length === 1
      ? partes[0]
      : `${partes.slice(0, -1).join(", ")} e ${partes.at(-1)}`;
  }

  function lista(itens, conector = "e") {
    const l = itens.filter(Boolean);
    if (!l.length) return "";
    if (l.length === 1) return l[0];
    return `${l.slice(0, -1).join(", ")} ${conector} ${l.at(-1)}`;
  }

  const hashtag = (s) => `#${semAcento(String(s).toLowerCase()).replace(/[^a-z0-9]/g, "")}`;

  return { local, nomeProprio, frase, fatos, ficha, lista, hashtag, semAcento };
})();
