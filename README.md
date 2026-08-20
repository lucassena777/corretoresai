# CorretoresAI

Central de conteúdo imobiliário: a IA escreve os roteiros, o calendário editorial
organiza as datas e o Kanban acompanha cada publicação até o ar.

**No ar:** https://corretoresai.com.br

O site publica sozinho: todo `git push` na `main` reconstrói o GitHub Pages em
cerca de um minuto.

Site estático — HTML, CSS e JavaScript puro, sem build step e sem dependências.
Para ver, abra `index.html` no navegador (dois cliques). Se preferir servir por
HTTP e tiver Python instalado:

```bash
python -m http.server 5173
```

## Estrutura

```
index.html              landing page (preto e dourado)
app/entrar.html         login e criação de conta
app/dashboard.html      resumo da operação: métricas, próximos posts, atividades
app/central.html        gerador de roteiros (área, funil, formato)
app/calendario.html     calendário editorial + Kanban, com arrastar-e-soltar
app/biblioteca.html     acervo com busca e filtros
app/historico.html      linha do tempo de tudo que aconteceu na conta
app/planos.html         planos e cota de gerações
app/perfil.html         perfil do corretor
app/configuracoes.html  padrões da Central, tema e dados da conta
assets/base.css         tokens de design, reset e componentes compartilhados
assets/site.css         estilos da landing
assets/app.css          estilos do shell do app, modal, assistente e avisos
assets/theme.js         alternância de tema (claro/escuro), salva no navegador
assets/config.js        endereço público do back-end
assets/texto.js         acentuação, cidades, bairros e leitura do briefing
assets/data.js          sementes, constantes, planos e helpers de data
assets/roteiro.js       engine de conteúdo: 3 ângulos, local ou pela IA
assets/db.js            contas, senha com hash e sessão no navegador
assets/store.js         estado da conta: conteúdos, perfil, plano e histórico
assets/ui.js            avisos, modal e o editor completo de conteúdo
assets/conhecimento.js  base de conhecimento do copiloto + busca por termo
assets/assistente.js    botão e gaveta do copiloto, no canto esquerdo
assets/auth.js          guarda de rota: exige login nas telas do app
assets/shell.js         injeta sprite de ícones, sidebar e topbar em todas as telas
```

Os scripts carregam sempre nesta ordem: `theme → texto → data → roteiro → db →
store → config → ui → assistente → auth → shell → tela`.

## Prévia publicada

O site inteiro cabe num arquivo só, com rotas por hash, para poder ser
compartilhado como link:

```bash
powershell -ExecutionPolicy Bypass -File tools/build-preview.ps1
```

Isso gera `dist/preview.html` (abre direto no navegador) e `dist/artifact.html`
(mesmo conteúdo, sem `<html>`/`<head>`, para publicar como Artifact). Rode o
build depois de qualquer mudança e publique de novo para atualizar o link.

Cada tela é uma função `initX(root)` escopada ao seu container, então o mesmo
código roda no site multipágina e dentro do arquivo único. O que decide é a
constante `SPA`, ligada só no build.

## Como o estado funciona

Existe **um estado só**, em `store.js`, salvo na chave `corretoresai-estado-v2` do
`localStorage`. Ele guarda os conteúdos, o perfil do corretor, o plano ativo, as
gerações consumidas e o histórico.

Qualquer tela pode chamar `store.subscribe(fn)` para se redesenhar quando algo
muda. Por isso mudar o nome no Perfil troca o nome na topbar, aprovar uma ideia
na Central faz o card aparecer no calendário, no Kanban e nas métricas do
dashboard, e arrastar um card grava uma linha no histórico.

## Tema

O tema **escuro (preto e dourado)** é o padrão — é a versão que evoluímos e que
ficou valendo. Existe um tema claro completo, acessível pelo botão de sol/lua no
header; a escolha fica salva em `localStorage`.

## O que já funciona de verdade

**Criar** — a Central gera 3 ideias por vez, cada uma com os 11 campos do roteiro.
"Aprovar e agendar" cria o conteúdo já no calendário e no Kanban; "Salvar
rascunho" manda para a Biblioteca.

**Editar** — clicar em qualquer card (calendário, Kanban, Biblioteca ou lista de
próximos conteúdos) abre o editor completo: título, data, horário, área, formato,
funil, status, tags e os 11 campos do roteiro. Dá para regerar o roteiro, copiar
tudo para a área de transferência, duplicar e excluir.

**Mover** — arrastar no calendário reagenda; arrastar entre colunas do Kanban
muda o status. Clicar no número de um dia abre a Central já com aquela data.

**Filtrar** — busca por título, tag ou área na Biblioteca, mais filtros de área,
formato, status e ordenação.

**Perfil e plano** — o nome vira as iniciais do avatar, a cidade vira o padrão da
Central e o tom de voz entra na sugestão de gravação de cada roteiro. Trocar de
plano muda a cota: o Gratuito trava na 5ª geração, o Pro na 40ª, o Ilimitado não
trava. Os botões de plano na landing já entram valendo dentro do app.

**Histórico** — cada criação, edição, mudança de data e movimento de card vira
uma linha, com tempo relativo, no dashboard e na Biblioteca.

Os números do dashboard e do mock da landing são calculados do acervo real — não
são valores fixos. Publicar mais conteúdo aumenta visualizações e leads.

## A IA de verdade (back-end)

Duas partes do site falam com um modelo de verdade, pela mesma Edge Function
(`supabase/functions/assistente/`) e pela mesma chave:

**O copiloto** — o botão no canto inferior esquerdo abre uma gaveta encostada na
sidebar (a navegação continua inteira e clicável) com um estrategista de
marketing imobiliário. Nada de resposta pronta: ele envia o perfil do corretor
(cidade, áreas, tom de voz) como contexto e recebe o texto em streaming.

Antes de enviar, o navegador consulta `assets/conhecimento.js` — a base com a
documentação da plataforma (Central, Calendário, Kanban, Biblioteca, Histórico,
Perfil, Planos, Configurações) e com o ofício (objeção de preço, CRECI e
documentação, financiamento, abordagem, copy, funil, leitura de mercado, e-mail,
reunião presencial, legenda). A pergunta pontua os verbetes por termo em comum e
os melhores viajam junto, num bloco de system separado e sem cache — assim o
prefixo cacheado continua valendo. Não é banco vetorial: para algumas dezenas de
verbetes, busca por palavra-chave no navegador resolve e não custa latência.

O indicador de raciocínio mostra o que foi realmente consultado ("Consultando:
Kanban de produção…") e cada resposta apoiada na base diz de onde veio.

O system prompt manda o modelo percorrer quatro etapas antes de escrever (situar
o caso, achar a dor e o gatilho de decisão, puxar o repertório certo, estruturar)
e entregar em três blocos: **Diagnóstico**, **Plano de ação** e **Dica de ouro**.
Pergunta objetiva e fechada pula os blocos e é respondida em duas linhas — o
formato existe para dar profundidade, não para inflar resposta curta.

**A Central de Conteúdo** — ao gerar, o briefing sai daqui já tratado pelo
`texto.js` (a IA recebe "São Paulo - Higienópolis", nunca "sao paulo
higienopolis") e volta como três ideias completas, uma por ângulo, em JSON com
schema fechado nos 11 campos do roteiro. O selo acima dos cartões diz de onde
veio o texto: **Escrito pela IA** ou **Modelo local**.

A chave da IA nunca chega ao navegador — ela vive como secret do projeto.

**O Copiloto executa, não só aconselha.** Ele tem a ferramenta
`agendar_conteudo`: pedir "agende um post sobre casas em Atibaia para a próxima
terça às 14h" faz o modelo resolver a data e chamar a ferramenta, e o **navegador**
criar o conteúdo no calendário — com roteiro pronto. Quem decide é o modelo;
quem executa é a máquina do corretor, direto no store da conta. Os dados dele
não passam pelo servidor.

```
navegador ──POST──▶ Edge Function (Supabase) ──▶ API Gemini
   ▲                  guarda GEMINI_API_KEY
   └──── SSE (texto + ações) ou JSON (roteiro) ────┘
```

Se o back-end não responder — sem chave, sem internet, fora do ar — a Central
cai sozinha na engine local do `roteiro.js` e avisa no rodapé da tela. O site
nunca fica sem gerar.

**Para ligar**, só falta a chave — é o único passo que precisa ser seu, porque
uma chave de API não deve passar por chat nem entrar no repositório:

1. Pegue uma chave em https://aistudio.google.com/apikey
2. Abra https://supabase.com/dashboard/project/cksboexpaegtdprkksix/settings/functions
3. Em **Edge Function Secrets**, adicione `GEMINI_API_KEY` com a sua chave.

Chave que passou por chat, e-mail ou print deixou de ser secreta: revogue e gere
outra antes de usar.

### Notas de campo sobre o Gemini

Coisas que só aparecem testando, e que custaram tempo aqui:

- **O modelo importa mais do que parece.** Com uma chave nova do AI Studio,
  `gemini-2.5-pro` e `gemini-2.5-flash` respondem **404** ("no longer available
  to new users") e `gemini-pro-latest` responde **429** — o plano gratuito não
  dá cota para os modelos pro. O que funciona de graça é flash; daí
  `gemini-3.5-flash`. Trocar de modelo é uma linha: a constante `MODELO`.
- **O stream vem com CRLF.** O Gemini separa os eventos SSE com `\r\n\r\n`, não
  `\n\n`. Um parser que corta em `\n\n` não acha separador nenhum, acumula tudo
  no buffer e entrega resposta vazia, sem erro. O parser aceita as duas formas.
- **O schema não é JSON Schema puro.** É um subconjunto de OpenAPI: tipos em
  maiúsculas (`"STRING"`, `"OBJECT"`) e nada de `additionalProperties`.

Erro da API vira mensagem em português com o status certo — chave recusada, sem
permissão, limite do plano gratuito, sobrecarga, tempo esgotado — e falha
transitória (429, 5xx) ganha uma retentativa automática. No chat, o servidor
manda um pulso a cada 12s para a conexão não cair enquanto o primeiro token não
vem, e o navegador desiste depois de 3 minutos de silêncio.

Sem a chave, o assistente responde dizendo que ainda não foi configurado e a
Central gera pelo modelo local — o resto do site funciona normalmente.

Para republicar a função depois de editá-la:

```bash
supabase functions deploy assistente --project-ref cksboexpaegtdprkksix
```

A `anon key` em `assets/config.js` é pública por definição (só identifica o
projeto). A função ainda checa a origem, limita 12 perguntas por minuto por IP
e corta mensagens muito longas.

## O que ainda é demonstração

- As contas são do navegador: e-mail e senha (com hash) ficam no `localStorage`
  da máquina, não num servidor. Serve para testar o fluxo inteiro, não para
  valer entre dispositivos.
- Os planos não cobram nada — trocar de plano só muda a cota de gerações.
- Visualizações e leads são estimativas derivadas do número de publicados.
- Tudo vive no navegador. Limpar o `localStorage` (ou usar "Restaurar o acervo
  original", em Configurações) volta ao acervo de fábrica.

## Origem deste repositório

O projeto começou na Hostinger (versão clara) e evoluiu num artifact do Claude em
outra conta (versão escura), à qual não temos mais acesso de edição. O código do
artifact não pôde ser exportado — ele roda dentro de um iframe isolado, sem opção
de download.

O que existe aqui foi reconstruído a partir das telas das duas versões: o visual
segue a versão escura, o conteúdo aproveita o que a versão clara tinha a mais
(benefícios, depoimentos, textos dos planos). O código é novo.

## Tokens de design

| Token | Escuro | Uso |
| --- | --- | --- |
| `--bg` | `#0e1012` | fundo da página |
| `--bg-alt` | `#121417` | seções alternadas |
| `--bg-deep` | `#0a0c0d` | sidebar, rodapé e CTA final |
| `--surface` | `#15181b` | cards e painéis |
| `--border` | `#262b31` | bordas visíveis |
| `--text` | `#f3f5f6` | texto principal |
| `--text-muted` | `#9aa1a8` | texto de apoio |
| `--gold` | `#c9a227` | cor de marca |
| `--gold-soft` | `#ddc074` | títulos em destaque e ícones |

O tema claro redefine os mesmos tokens em `:root[data-theme="light"]`.
