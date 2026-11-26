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

// limpa páginas antigas (produtos removidos)
const pastaP = path.join(raiz, "p");
fs.rmSync(pastaP, { recursive: true, force: true });
fs.mkdirSync(pastaP, { recursive: true });

const ids = new Set();
for (const p of P) {
  if (!/^[a-z0-9-]+$/.test(p.id)) { console.warn("⚠️  ID inválido (use só a-z, 0-9 e -):", p.id); continue; }
  if (ids.has(p.id)) { console.warn("⚠️  ID repetido:", p.id); continue; }
  ids.add(p.id);
  const desc = (p.descricao || S.slogan).slice(0, 180);
  const img = p.imagem || url + "/assets/img/og-padrao.png";
  const og = [
    `<link rel="canonical" href="${url}/p/${p.id}/">`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta property="og:type" content="product">`,
    `<meta property="og:site_name" content="${esc(S.nome)}">`,
    `<meta property="og:title" content="${esc(p.titulo)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${url}/p/${p.id}/">`,
    `<meta property="og:image" content="${esc(img)}">`,
    `<meta name="twitter:card" content="summary_large_image">`
  ].join("\n");
  let html = modelo
    .replace("<!--OG-->", og)
    .replace(/<title>.*?<\/title>/, `<title>${esc(p.titulo)} | ${esc(S.nome)}</title>`)
    .replace('data-base=""', `data-base="../../" data-id="${p.id}"`)
    .replace(/(href|src)="assets\//g, '$1="../../assets/');
  fs.mkdirSync(path.join(pastaP, p.id), { recursive: true });
  fs.writeFileSync(path.join(pastaP, p.id, "index.html"), html);
}

// sitemap
const hoje = new Date().toISOString().slice(0, 10);
const urls = [`${url}/`, `${url}/sobre.html`, ...[...ids].map((id) => `${url}/p/${id}/`)];
fs.writeFileSync(path.join(raiz, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc><lastmod>${hoje}</lastmod></url>`).join("\n") + `\n</urlset>\n`);
fs.writeFileSync(path.join(raiz, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /admin.html\nSitemap: ${url}/sitemap.xml\n`);

console.log(`✅ ${ids.size} páginas de produto geradas em /p/ + sitemap.xml`);
