# CorretoresAI

Central de conteúdo imobiliário: a IA escreve os roteiros, o calendário editorial
organiza as datas e o Kanban acompanha cada publicação até o ar.

**No ar:** https://lucassena777.github.io/corretoresai/

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
app/dashboard.html      resumo da operação: métricas, próximos posts, atividades
app/central.html        gerador de roteiros (área, funil, formato)
app/calendario.html     calendário editorial + Kanban, com arrastar-e-soltar
app/biblioteca.html     acervo com busca e filtros + histórico
app/perfil.html         perfil do corretor + configurações
assets/base.css         tokens de design, reset e componentes compartilhados
assets/site.css         estilos da landing
assets/app.css          estilos do shell do app, modal e avisos
assets/data.js          sementes, constantes e o gerador de roteiro
assets/store.js         estado único: conteúdos, perfil, plano e histórico
assets/ui.js            avisos, modal e o editor completo de conteúdo
assets/shell.js         injeta sprite de ícones, sidebar e topbar em todas as telas
assets/theme.js         alternância de tema (claro/escuro), salva no navegador
```

Os scripts carregam sempre nesta ordem: `theme → data → store → ui → shell → tela`.

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

## O que ainda é demonstração

- A geração de roteiro é montada no navegador a partir do briefing, do perfil e
  de modelos de texto. A IA de verdade entra quando houver back-end.
- Não existe autenticação: "Entrar" leva direto ao dashboard da conta de exemplo.
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
