# CorretoresAI

Landing page da central de conteúdo imobiliário CorretoresAI.

Site estático — HTML, CSS e um pouco de JS, sem build step. Para ver localmente,
basta abrir `index.html` no navegador (dois cliques). Se preferir servir por HTTP
e você tiver Python ou Node instalados:

```bash
python -m http.server 5173
```

## Estrutura

- `index.html` — página única com header, hero e a faixa de números.
- `assets/styles.css` — tokens de design e todos os estilos.
- `assets/app.js` — mock do calendário editorial e alternância de tema.

## Origem deste repositório

O projeto nasceu num artifact do Claude (`CorretoresAI — prévia navegável`) criado
em outra conta, à qual não temos mais acesso de edição. O código-fonte original do
artifact não pôde ser exportado: ele é servido dentro de um iframe isolado
(`*.frame.claudeusercontent.com`), sem opção de download e sem acesso via script.

O que existe aqui foi **reconstruído a partir da prévia renderizada**, então o
visual segue o original, mas o código é novo.

## O que falta

Só a primeira dobra da prévia original pôde ser lida (a rolagem e os cliques não
chegam ao conteúdo do iframe). Estas seções existem no original e ainda são
placeholders aqui:

- `#recursos` — Recursos
- `#como-funciona` — Como funciona
- `#planos` — Planos
- rodapé

Para reconstruí-las, o caminho mais rápido é abrir o artifact original, rolar até
cada seção e salvar as capturas de tela — ou colar o HTML original, se ele puder
ser recuperado.

## Tokens de design

| Token | Valor (tema escuro) | Uso |
| --- | --- | --- |
| `--bg` | `#0b0b0d` | fundo da página |
| `--surface` | `#121214` | cards e mock da plataforma |
| `--border` | `#26262b` | bordas visíveis |
| `--text` | `#f4f2ee` | texto principal |
| `--text-muted` | `#a3a099` | texto de apoio |
| `--gold` | `#c9a54e` | cor de marca, botões, destaques |
| `--gold-soft` | `#dcc084` | títulos em destaque, ícones |

O tema claro está definido em `:root[data-theme="light"]` e é alternado pelo botão
no header.
