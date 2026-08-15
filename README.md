# CorretoresAI

Central de conteúdo imobiliário: a IA escreve os roteiros, o calendário editorial
organiza as datas e o Kanban acompanha cada publicação até o ar.

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
assets/app.css          estilos do shell do app
assets/shell.js         injeta sprite de ícones, sidebar e topbar em todas as telas
assets/data.js          acervo de demonstração + persistência em localStorage
assets/theme.js         alternância de tema (claro/escuro), salva no navegador
```

## Tema

O tema **escuro (preto e dourado)** é o padrão — é a versão que evoluímos e que
ficou valendo. Existe um tema claro completo, acessível pelo botão de sol/lua no
header; a escolha fica salva em `localStorage`.

## O que já funciona de verdade

- Arrastar cards no calendário para reagendar e entre as colunas do Kanban para
  mudar o status. Tudo salva sozinho em `localStorage` e o dashboard acompanha.
- Busca e filtros da biblioteca por área, formato e status.
- Geração de roteiro na Central de Conteúdo com os 11 campos (título, gancho,
  desenvolvimento, prova, CTA, legenda, hashtags, objetivo, público, formato e
  sugestão de gravação).

## O que ainda é demonstração

- A geração de roteiro é montada no navegador a partir do briefing. A IA de
  verdade entra quando houver back-end.
- Não existe autenticação: "Entrar" leva direto ao dashboard da conta de exemplo
  (Marina Duarte, plano Ilimitado).
- Métricas de visualizações e leads são estimativas fixas.

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
