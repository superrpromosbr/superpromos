/*
  Página de cada oferta: /p/ID
  Monta a página na hora, com título, descrição e foto da oferta
  (é isso que gera a prévia bonita no Discord e no WhatsApp).
*/
const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const PROIBIDO = /zoom|menor pre[çc]o|lojas comparadas|\d+\s*%\s*off|-\s*\d+\s*%/i;
const limparDescricao = (t) => String(t || "").split(/(?<=[.!?])\s+/).filter((f) => !PROIBIDO.test(f)).join(" ").trim();

async function lerLista(env, origem) {
  if (env.OFERTAS) {
    const v = await env.OFERTAS.get("produtos");
    if (v) return JSON.parse(v);
  }
  // reserva: lista do arquivo assets/js/products.js
  const r = await env.ASSETS.fetch(new URL("/assets/js/products.js", origem));
  const t = await r.text();
  const i = t.indexOf("[");
  try { return JSON.parse(t.slice(i, t.lastIndexOf("]") + 1)); } catch (e) { return []; }
}

export async function onRequestGet({ params, env, request }) {
  const url = new URL(request.url);
  const id = String((params.path || [])[0] || "").toLowerCase();
  if (!/^[a-z0-9-]+$/.test(id)) return env.ASSETS.fetch(new URL("/404.html", url.origin));

  const lista = await lerLista(env, url.origin);
  const p = lista.find((x) => x.id === id);
  let tpl = await (await env.ASSETS.fetch(new URL("/produto.html", url.origin))).text();
  if (!tpl.includes("<!--OG-->")) tpl = await (await env.ASSETS.fetch(new URL("/produto", url.origin))).text();

  const titulo = p ? p.titulo : "Oferta não encontrada";
  const desc = p ? (limparDescricao(p.descricao) || "Oferta selecionada pela Super Promos BR · confira o preço atualizado na Amazon").slice(0, 180) : "Veja as ofertas da Super Promos BR";
  const img = p && p.imagem ? p.imagem : url.origin + "/assets/img/og-padrao.png";
  const og = [
    `<link rel="canonical" href="${url.origin}/p/${id}/">`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta property="og:type" content="product">`,
    `<meta property="og:site_name" content="Super Promos BR">`,
    `<meta property="og:title" content="${esc(titulo)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${url.origin}/p/${id}/">`,
    `<meta property="og:image" content="${esc(img)}">`,
    `<meta name="twitter:card" content="summary_large_image">`
  ].join("\n");

  const html = tpl
    .replace("<!--OG-->", og)
    .replace(/<title>.*?<\/title>/, `<title>${esc(titulo)} | Super Promos BR</title>`)
    .replace('data-base=""', `data-base="/" data-id="${id}"`)
    .replace(/(href|src)="assets\//g, '$1="/assets/');

  return new Response(html, {
    status: p ? 200 : 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" }
  });
}
