/*
  GERADOR DE PÁGINAS (opcional, mas recomendado)
  ------------------------------------------------
  Cria uma página fixa para cada produto em /p/ID/ com título, descrição e imagem
  próprios. É isso que faz o Discord/WhatsApp mostrarem a prévia bonita do produto.
  Também gera o sitemap.xml.

  Como usar:  node build.js
  (Na Cloudflare Pages via GitHub: comando de build = "node build.js", pasta de saída = "/")
*/
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const raiz = __dirname;

// Garante que as imagens estejam em assets/img (caso tenham sido enviadas soltas na raiz)
fs.mkdirSync(path.join(raiz, "assets/img"), { recursive: true });
for (const f of ["logo.png", "logo.svg", "og-padrao.png"]) {
  const solto = path.join(raiz, f), certo = path.join(raiz, "assets/img", f);
  if (fs.existsSync(solto) && !fs.existsSync(certo)) fs.copyFileSync(solto, certo);
}
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(raiz, "assets/js/config.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(raiz, "assets/js/products.js"), "utf8"), ctx);
const S = ctx.window.SITE;
const P = ctx.window.PRODUTOS || [];
const url = (S.url || "").replace(/\/$/, "");

const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// Versão nos links de CSS/JS: força o navegador a baixar a lista nova a cada publicação
const versao = Date.now().toString(36);
for (const f of ["index.html", "produto.html", "404.html", "admin.html", "sobre.html", "privacidade.html", "termos.html"]) {
  const arq = path.join(raiz, f);
  if (!fs.existsSync(arq)) continue;
  const html = fs.readFileSync(arq, "utf8").replace(/(assets\/(?:js|css)\/[a-z-]+\.(?:js|css))(\?v=[a-z0-9]+)?"/g, `$1?v=${versao}"`);
  fs.writeFileSync(arq, html);
}
const modelo = fs.readFileSync(path.join(raiz, "produto.html"), "utf8");

// As páginas /p/ID agora são montadas na hora pela função functions/p/[[path]].js
fs.rmSync(path.join(raiz, "p"), { recursive: true, force: true });
const ids = new Set(P.map((p) => p.id));

// sitemap
const hoje = new Date().toISOString().slice(0, 10);
const urls = [`${url}/`, `${url}/sobre.html`, ...[...ids].map((id) => `${url}/p/${id}/`)];
fs.writeFileSync(path.join(raiz, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc><lastmod>${hoje}</lastmod></url>`).join("\n") + `\n</urlset>\n`);
fs.writeFileSync(path.join(raiz, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /admin.html\nSitemap: ${url}/sitemap.xml\n`);

console.log(`✅ versão ${versao} aplicada + sitemap.xml (${ids.size} ofertas no arquivo reserva)`);
