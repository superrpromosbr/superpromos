/*
  LISTA DE OFERTAS (botão "Publicar" do painel)
  ---------------------------------------------
  GET  /api/ofertas  -> devolve a lista publicada
  POST /api/ofertas  -> publica uma lista nova (precisa da senha do painel)

  Configuração na Cloudflare (projeto superpromos > Settings):
    - Bindings: KV namespace com o nome de variável OFERTAS
    - Variables and Secrets: ADMIN_SENHA (tipo Secret) = senha do painel
*/
// Sem preço digitado, sem selo de desconto (regras do Programa de Associados)
const CAMPOS = ["id", "titulo", "categoria", "asin", "url", "imagem", "descricao", "destaque", "cupom",
  "data", "api", "tituloFixo"];
const PROIBIDO = /zoom|menor pre[çc]o|lojas comparadas|\d+\s*%\s*off|-\s*\d+\s*%/i;
function limparDescricao(t) {
  if (!t) return "";
  return String(t).split(/(?<=[.!?])\s+/).filter((f) => !PROIBIDO.test(f)).join(" ").trim();
}
function sanear(lista) {
  return (lista || []).map((p) => {
    const o = {};
    for (const c of CAMPOS) if (p[c] !== undefined && p[c] !== null && p[c] !== "") o[c] = p[c];
    if (o.descricao) { o.descricao = limparDescricao(o.descricao); if (!o.descricao) delete o.descricao; }
    return o;
  });
}

function json(dados, status) {
  return new Response(JSON.stringify(dados), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function iguais(a, b) {
  a = String(a || ""); b = String(b || "");
  let dif = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) dif |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return dif === 0;
}

function limpar(lista) {
  if (!Array.isArray(lista)) throw new Error("A lista precisa ser um array.");
  if (lista.length > 1000) throw new Error("Máximo de 1000 ofertas.");
  const ids = new Set();
  return lista.map((p, i) => {
    if (!p || typeof p !== "object") throw new Error("Oferta " + (i + 1) + " inválida.");
    const o = {};
    for (const c of CAMPOS) if (p[c] !== undefined && p[c] !== null && p[c] !== "") o[c] = typeof p[c] === "boolean" ? p[c] : String(p[c]).slice(0, 2000);
    if (!/^[a-z0-9-]{1,80}$/.test(o.id || "")) throw new Error("ID inválido na oferta " + (i + 1) + ".");
    if (ids.has(o.id)) throw new Error("ID repetido: " + o.id);
    ids.add(o.id);
    if (!o.titulo) throw new Error("Oferta sem título: " + o.id);
    if (!o.asin && !o.url) throw new Error("Oferta sem link: " + o.id);
    if (o.url && !/^https:\/\/([a-z0-9-]+\.)*(amazon\.com\.br|amzn\.to|link\.amazon)\//i.test(o.url)) throw new Error("Link fora da Amazon: " + o.id);
    if (o.imagem && !/^https:\/\//i.test(o.imagem)) delete o.imagem;
    return o;
  });
}

export async function onRequestGet({ env }) {
  if (!env.OFERTAS) return json({ produtos: null, configurado: false });
  const [v, quando] = await Promise.all([env.OFERTAS.get("produtos"), env.OFERTAS.get("atualizado")]);
  return json({ produtos: v ? sanear(JSON.parse(v)) : null, atualizado: quando, configurado: !!env.ADMIN_SENHA });
}

export async function onRequestPost({ request, env }) {
  if (!env.OFERTAS || !env.ADMIN_SENHA) return json({ erro: "Publicação ainda não configurada na Cloudflare (KV OFERTAS ou ADMIN_SENHA)." }, 503);
  if (!iguais(request.headers.get("x-senha"), env.ADMIN_SENHA)) {
    await new Promise((r) => setTimeout(r, 800));
    return json({ erro: "Senha incorreta." }, 401);
  }
  let lista;
  try {
    const texto = await request.text();
    if (texto.length > 1500000) throw new Error("Lista grande demais.");
    lista = sanear(limpar(JSON.parse(texto)));
  } catch (e) {
    return json({ erro: String(e.message || e) }, 400);
  }
  const agora = new Date().toISOString();
  await env.OFERTAS.put("produtos", JSON.stringify(lista));
  await env.OFERTAS.put("atualizado", agora);
  return json({ ok: true, total: lista.length, atualizado: agora });
}
