// Gera os ícones do app a partir da própria marca do produto.
//
// Por que desenhar em vez de exportar de um editor: o glifo já existe como SVG
// em assets/shell.js, e ele é feito só de segmentos retos com ponta
// arredondada. Redesenhar aqui, a partir das mesmas coordenadas, garante que o
// ícone do iPhone seja exatamente a marca do site — e que continue sendo se a
// marca mudar, porque as coordenadas ficam num lugar só.
//
// O iPhone não aceita SVG em apple-touch-icon: tem que ser PNG. Como não há
// biblioteca de imagem nesta máquina, o desenho é feito por campo de distância
// (cada pixel calcula a que distância está da forma) e a suavização vem de
// amostrar cada pixel várias vezes. É o mesmo princípio que um renderizador de
// fonte usa, e cabe em cem linhas.
//
// Rodar:  ELECTRON_RUN_AS_NODE=1 "<Code.exe>" tools/gerar-icones.js

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

/* ---------------- A marca, nas coordenadas originais (viewBox 24x24) ------- */

const TRACOS = [
  [[4, 20], [4, 8], [10, 4], [10, 20]],   // torre da esquerda
  [[10, 20], [20, 20], [20, 11], [14, 9]], // bloco da direita
  [[14, 14], [16, 14]],                    // janelas
  [[14, 17], [16, 17]],
  [[7, 11], [8, 11]],
  [[7, 14], [8, 14]],
];
const ESPESSURA = 1.6;   // stroke-width do SVG

const COR = {
  fundoTopo:  [26, 22, 10],    // preto com um fio de dourado no alto
  fundoBase:  [10, 12, 13],
  borda:      [140, 109, 31],  // --gold-deep
  glifoTopo:  [227, 203, 138], // --gold-bright
  glifoBase:  [201, 162, 39],  // --gold
};

/* ---------------- Campos de distância ---------------- */

const misturar = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// Distância de um ponto ao retângulo de cantos arredondados.
function distRetangulo(px, py, meiaL, meiaA, raio) {
  const qx = Math.abs(px) - meiaL + raio;
  const qy = Math.abs(py) - meiaA + raio;
  const fora = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return fora + Math.min(Math.max(qx, qy), 0) - raio;
}

// Distância de um ponto ao segmento de reta — é isto que dá a ponta
// arredondada de graça, igual ao stroke-linecap="round" do SVG.
function distSegmento(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const comprimento = vx * vx + vy * vy;
  const t = comprimento === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / comprimento));
  return Math.hypot(wx - vx * t, wy - vy * t);
}

function distGlifo(px, py) {
  let menor = Infinity;
  for (const traco of TRACOS) {
    for (let i = 0; i < traco.length - 1; i++) {
      const d = distSegmento(px, py, traco[i][0], traco[i][1], traco[i + 1][0], traco[i + 1][1]);
      if (d < menor) menor = d;
    }
  }
  return menor - ESPESSURA / 2;
}

/* ---------------- Desenho ---------------- */

function desenhar(lado, { comBorda = true } = {}) {
  const AMOSTRAS = 4;                    // 4x4 por pixel
  const pixels = Buffer.alloc(lado * lado * 4);

  const centro = lado / 2;
  const meia = lado / 2;
  const raioFundo = lado * 0.225;        // proporção que o iOS usa
  const inset = lado * 0.085;            // onde corre a borda dourada
  const larguraBorda = Math.max(1.5, lado * 0.018);

  // O glifo ocupa 46% do lado, centralizado.
  const escala = (lado * 0.46) / 24;

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let sy = 0; sy < AMOSTRAS; sy++) {
        for (let sx = 0; sx < AMOSTRAS; sx++) {
          const px = x + (sx + 0.5) / AMOSTRAS;
          const py = y + (sy + 0.5) / AMOSTRAS;

          // Fundo: gradiente vertical, recortado no retângulo arredondado.
          const dFundo = distRetangulo(px - centro, py - centro, meia, meia, raioFundo);
          let cor = misturar(COR.fundoTopo, COR.fundoBase, py / lado);
          let alfa = Math.max(0, Math.min(1, 0.5 - dFundo));

          // Borda dourada, um pouco para dentro.
          const dBorda = Math.abs(
            distRetangulo(px - centro, py - centro, meia - inset, meia - inset, raioFundo - inset)
          ) - larguraBorda / 2;
          if (comBorda) {
            const cobertura = Math.max(0, Math.min(1, 0.5 - dBorda));
            if (cobertura > 0) {
              cor = misturar(cor, COR.borda, cobertura);
              alfa = Math.max(alfa, cobertura * Math.max(0, Math.min(1, 0.5 - dFundo)));
            }
          }

          // Glifo dourado no centro.
          const gx = (px - centro) / escala + 12;
          const gy = (py - centro) / escala + 12;
          const dGlifo = distGlifo(gx, gy) * escala;
          const cobGlifo = Math.max(0, Math.min(1, 0.5 - dGlifo));
          if (cobGlifo > 0) {
            cor = misturar(cor, misturar(COR.glifoTopo, COR.glifoBase, py / lado), cobGlifo);
          }

          r += cor[0] * alfa; g += cor[1] * alfa; b += cor[2] * alfa; a += alfa;
        }
      }

      const total = AMOSTRAS * AMOSTRAS;
      const i = (y * lado + x) * 4;
      pixels[i]     = Math.round(a > 0 ? r / a : 0);
      pixels[i + 1] = Math.round(a > 0 ? g / a : 0);
      pixels[i + 2] = Math.round(a > 0 ? b / a : 0);
      pixels[i + 3] = Math.round((a / total) * 255);
    }
  }

  return pixels;
}

/* ---------------- PNG na mão ---------------- */

const TABELA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pedaco(tipo, dados) {
  const nome = Buffer.from(tipo, "ascii");
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([nome, dados])));
  return Buffer.concat([tamanho, nome, dados, crc]);
}

function png(pixels, lado) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8;    // 8 bits por canal
  ihdr[9] = 6;    // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Cada linha vai precedida do byte de filtro (0 = nenhum).
  const linhas = Buffer.alloc(lado * (lado * 4 + 1));
  for (let y = 0; y < lado; y++) {
    linhas[y * (lado * 4 + 1)] = 0;
    pixels.copy(linhas, y * (lado * 4 + 1) + 1, y * lado * 4, (y + 1) * lado * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco("IHDR", ihdr),
    pedaco("IDAT", zlib.deflateSync(linhas, { level: 9 })),
    pedaco("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------------- Saída ---------------- */

const destino = path.join(__dirname, "..", "icones");
fs.mkdirSync(destino, { recursive: true });

// 180 é o que o iPhone usa em apple-touch-icon; 192 e 512 são os do manifesto.
for (const lado of [180, 192, 512]) {
  const arquivo = path.join(destino, `icone-${lado}.png`);
  fs.writeFileSync(arquivo, png(desenhar(lado), lado));
  console.log(`Gerado: icones/icone-${lado}.png (${fs.statSync(arquivo).size} bytes)`);
}
