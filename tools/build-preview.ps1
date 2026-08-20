# Gera dist/preview.html: o site inteiro num arquivo só, com rotas por hash.
# Serve para publicar a prévia como link. Rode depois de qualquer mudança:
#   powershell -ExecutionPolicy Bypass -File tools\build-preview.ps1
#
# Codificacao: o PowerShell le este arquivo como ANSI, entao acento dentro de
# string que vai para o HTML sai como mojibake no dist. Comentario de PowerShell
# pode ter acento; texto emitido para o arquivo gerado, nao.

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $raiz "dist"
if (-not (Test-Path $dist)) { New-Item -ItemType Directory -Path $dist | Out-Null }

function Ler($caminho) { Get-Content (Join-Path $raiz $caminho) -Raw -Encoding UTF8 }

# Recorta o trecho entre o marcador de abertura e o PRIMEIRO fechamento depois dele.
# (Usar o ultimo fechamento engoliria conteudo demais: <svg> aparece varias vezes.)
function Recortar($texto, $abre, $fecha) {
  $i = $texto.IndexOf($abre)
  if ($i -lt 0) { throw "Marcador de abertura nao encontrado: $abre" }
  $j = $texto.IndexOf($fecha, $i)
  if ($j -lt 0) { throw "Marcador de fechamento nao encontrado: $fecha" }
  return $texto.Substring($i, $j - $i + $fecha.Length)
}

$index = Ler "index.html"

# Sprites: o da landing + o do shell (ids repetidos sao ignorados pelo browser).
$spriteLanding = Recortar $index '<svg width="0" height="0"' '</svg>'
$shellJs = Ler "assets\shell.js"
$spriteShell = $shellJs.Substring($shellJs.IndexOf('<svg width="0"'))
$spriteShell = $spriteShell.Substring(0, $spriteShell.IndexOf('</svg>`;') + 6)

# Telas.
# A landing usa marcadores proprios: recortar por tag daria errado, porque
# existe um <footer> dentro de cada depoimento antes do rodape do site.
$landing = Recortar $index '<!--@landing-inicio-->' '<!--@landing-fim-->'

# Rede de seguranca: se o recorte da landing perder o rodape, o HTML sai
# desbalanceado e as telas do app acabam aninhadas dentro dela (invisiveis).
if ($landing -notmatch 'class="site-footer"') {
  throw "Recorte da landing nao inclui o rodape do site."
}

$nomes = @("dashboard", "central", "calendario", "biblioteca", "historico",
           "planos", "perfil", "configuracoes")

$telas = [ordered]@{}
foreach ($nome in $nomes) {
  $html = Ler "app\$nome.html"
  $telas[$nome] = Recortar $html '<main class="view">' '</main>'
}

# A tela de login fica fora do shell do app (nao tem sidebar).
$entrarHtml = Ler "app\entrar.html"
$telaEntrar = (Recortar $entrarHtml '<button class="theme-btn auth-tema"' '</button>') + "`n" +
              (Recortar $entrarHtml '<main class="auth"' '</main>')

# Titulo e subtitulo de cada tela, lidos do proprio HTML.
$metas = [ordered]@{}
foreach ($nome in $telas.Keys) {
  $html = Ler "app\$nome.html"
  $t = [regex]::Match($html, 'data-title="([^"]*)"').Groups[1].Value
  $s = [regex]::Match($html, 'data-subtitle="([^"]*)"').Groups[1].Value
  $metas[$nome] = @{ title = $t; subtitle = $s }
}

$css = @("assets\base.css", "assets\site.css", "assets\app.css") | ForEach-Object { Ler $_ }
$js = @(
  "assets\theme.js", "assets\config.js", "assets\texto.js",
  "assets\data.js", "assets\roteiro.js", "assets\db.js", "assets\store.js", "assets\ui.js",
  "assets\conhecimento.js", "assets\assistente.js",
  "assets\auth.js", "assets\shell.js", "assets\site.js", "assets\entrar.js",
  "assets\dashboard.js", "assets\central.js", "assets\board.js",
  "assets\biblioteca.js", "assets\historico.js", "assets\planos.js",
  "assets\perfil.js", "assets\configuracoes.js"
) | ForEach-Object { Ler $_ }

# Templates das telas, para o roteador montar sob demanda.
$templates = (($telas.GetEnumerator() | ForEach-Object {
  "<template data-tela=`"$($_.Key)`">$($_.Value)</template>"
}) + @("<template data-tela=`"entrar`">$telaEntrar</template>")) -join "`n"

$metasJson = ($metas.GetEnumerator() | ForEach-Object {
  "  $($_.Key): { title: `"$($_.Value.title)`", subtitle: `"$($_.Value.subtitle)`" }"
}) -join ",`n"

$corpo = @"
<style>
$($css -join "`n")
</style>
<script>
  const PREVIEW_SPA = true;
  try { document.documentElement.dataset.theme = localStorage.getItem("corretoresai-theme") || "dark"; } catch (e) { document.documentElement.dataset.theme = "dark"; }
</script>

$spriteLanding
$spriteShell

<div data-landing>
$landing
</div>

<div data-app hidden></div>

$templates

<script>
$($js -join "`n")
</script>

<script>
// Roteador por hash: #/ abre a landing, o resto monta uma tela dentro do shell.
(function router() {
  const elLanding = document.querySelector("[data-landing]");
  const elApp = document.querySelector("[data-app]");

  const METAS = {
$metasJson
  };

  // Rotas que reaproveitam uma tela existente.
  const ALIAS = {
    kanban: { tela: "calendario", view: "kanban" }
  };

  const INITS = {
    dashboard: (root) => initDashboard(root),
    central: (root) => initCentral(root),
    calendario: (root, opts) => initBoard(root, opts),
    biblioteca: (root) => initBiblioteca(root),
    historico: (root) => initHistorico(root),
    planos: (root) => initPlanos(root),
    perfil: (root) => initPerfil(root),
    configuracoes: (root) => initConfiguracoes(root)
  };

  let landingPronta = false;

  function mostrarLanding(ancora) {
    elApp.hidden = true;
    elApp.className = "";
    elApp.innerHTML = "";
    elLanding.hidden = false;

    store.dropSubscribers();
    desligarAssistente();
    if (!landingPronta) { initLanding(elLanding); landingPronta = true; }

    const alvo = ancora && elLanding.querySelector("#" + ancora);
    if (alvo) alvo.scrollIntoView();
    else window.scrollTo(0, 0);
  }

  // Login e cadastro: tela cheia, sem sidebar.
  function mostrarEntrar() {
    elLanding.hidden = true;
    store.dropSubscribers();
    elApp.hidden = false;
    elApp.className = "";
    elApp.innerHTML = "";
    elApp.appendChild(document.querySelector('[data-tela="entrar"]').content.cloneNode(true));
    desligarAssistente();
    initEntrar(elApp);
    window.scrollTo(0, 0);
  }

  function mostrarTela(nome, opts) {
    const molde = document.querySelector('[data-tela="' + nome + '"]');
    if (!molde) return mostrarLanding();

    elLanding.hidden = true;
    store.dropSubscribers();

    const meta = METAS[nome] || { title: "", subtitle: "" };
    elApp.hidden = false;
    elApp.className = "app";
    elApp.innerHTML = shellHTML({ page: opts.page || nome, title: meta.title, subtitle: meta.subtitle });

    const view = molde.content.cloneNode(true);
    const coluna = elApp.querySelector(".app-col");
    coluna.appendChild(view);

    renderIdentity();
    store.subscribe(renderIdentity);
    // A previa monta a sidebar aqui, sem passar pelo renderShell: sem esta
    // linha o assistente nunca era criado e o item da sidebar nao respondia.
    ligarAssistente(elApp);
    INITS[nome](coluna.querySelector(".view"), opts);

    const alvo = opts.ancora && coluna.querySelector("#" + opts.ancora);
    if (alvo) alvo.scrollIntoView();
    else window.scrollTo(0, 0);
  }

  function rotear() {
    const bruto = location.hash.replace(/^#\//, "").split("?")[0];

    // Ancoras da landing (#recursos, #planos...) continuam funcionando.
    if (!location.hash.startsWith("#/")) {
      const ancora = location.hash.slice(1);
      if (elLanding.hidden || !landingPronta) mostrarLanding(ancora);
      return;
    }

    if (!bruto) return mostrarLanding();
    if (bruto === "entrar") return mostrarEntrar();

    const alias = ALIAS[bruto];
    const nome = alias?.tela || bruto;
    if (!INITS[nome]) return mostrarLanding();

    mostrarTela(nome, { page: bruto, view: alias?.view });
  }

  window.addEventListener("hashchange", rotear);
  rotear();
})();
</script>
"@

$titulo = "<title>CorretoresAI</title>"
$utf8 = New-Object System.Text.UTF8Encoding($false)

# 1) Arquivo autonomo, para abrir direto no navegador.
$paginaCompleta = @"
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
$titulo
</head>
<body>
$corpo
</body>
</html>
"@

# 2) Versao para publicar como Artifact (o host injeta doctype/head/body).
$paginaArtifact = "$titulo`n$corpo"

$a = Join-Path $dist "preview.html"
$b = Join-Path $dist "artifact.html"
[System.IO.File]::WriteAllText($a, $paginaCompleta, $utf8)
[System.IO.File]::WriteAllText($b, $paginaArtifact, $utf8)

foreach ($f in @($a, $b)) {
  Write-Output "Gerado: $f ($([math]::Round((Get-Item $f).Length / 1KB)) KB)"
}
