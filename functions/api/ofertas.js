/*
  LISTA DE OFERTAS (botão "Publicar" do painel)
  ---------------------------------------------
  GET  /api/ofertas            -> lista pública (sem as pendentes)
  GET  /api/ofertas?todos=1    -> painel: tudo, inclusive pendentes (precisa da senha no cabeçalho x-senha)
  POST /api/ofertas  (senha)   -> { op: "salvar", produto, idAntigo, pendente }
                                  { op: "apagar", id }
                                  { op: "publicar", ids? }   (sem ids = publica todas as pendentes)
                                  [ ...lista ]               (substitui tudo — usado só para restaurar cópia)
  Cada alteração mexe só na oferta indicada, então dois aparelhos não apagam o trabalho um do outro.

  Configuração na Cloudflare (projeto superpromos > Settings):
    - Bindings: KV namespace com o nome de variável OFERTAS
    - Variables and Secrets: ADMIN_SENHA (tipo Secret) = senha do painel
*/
// Sem preço digitado, sem selo de desconto (regras do Programa de Associados)
const CAMPOS = ["id", "titulo", "categoria", "loja", "asin", "url", "imagem", "descricao", "destaque", "cupom",
  "data", "api", "tituloFixo", "oculto"];
const PROIBIDO = /zoom|menor pre[çc]o|lojas comparadas|\d+\s*%\s*off|-\s*\d+\s*%/i;
function limparDescricao(t) {
  if (!t) return "";
  return String(t).split(/(?<=[.!?])\s+/).filter((f) => !PROIBIDO.test(f)).join(" ").trim();
}
// Mercado Livre: só links do próprio Mercado Livre (meli.la/..., mercadolivre.com/sec/..., mercadolivre.com.br/...), sem encurtadores de terceiros
const ML = /^https:\/\/(([a-z0-9-]+\.)*mercadolivre\.com(\.br)?|meli\.la)\//i;
function sanear(lista) {
  return (lista || []).map((p) => {
    const o = {};
    for (const c of CAMPOS) if (p[c] !== undefined && p[c] !== null && p[c] !== "") o[c] = p[c];
    if (o.descricao) { o.descricao = limparDescricao(o.descricao); if (!o.descricao) delete o.descricao; }
    o.loja = ML.test(o.url || "") ? "mercadolivre" : "amazon";
    if (o.loja === "mercadolivre") { delete o.asin; delete o.api; }
    if (o.oculto !== true) delete o.oculto;
    return o;
  });
}
const publica = (lista) => sanear(lista).filter((p) => !p.oculto);

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
    if (o.url && !/^https:\/\/([a-z0-9-]+\.)*(amazon\.com\.br|amzn\.to|link\.amazon)\//i.test(o.url) && !ML.test(o.url)) throw new Error("Link que não é da Amazon nem do Mercado Livre: " + o.id);
    if (ML.test(o.url || "")) {
      const u = new URL(o.url);
      if (/^(lista|listado)\./i.test(u.hostname) || u.pathname === "/" || u.pathname === "") throw new Error("Link do Mercado Livre precisa ser de um produto (não de busca/página inicial): " + o.id);
    }
    if (o.imagem && !/^https:\/\//i.test(o.imagem)) delete o.imagem;
    return o;
  });
}

async function senhaOk(request, env) {
  if (iguais(request.headers.get("x-senha"), env.ADMIN_SENHA)) return true;
  await new Promise((r) => setTimeout(r, 800));
  return false;
}
async function ler(env) {
  const [v, quando] = await Promise.all([env.OFERTAS.get("produtos"), env.OFERTAS.get("atualizado")]);
  return { lista: v ? JSON.parse(v) : [], atualizado: quando };
}
async function gravar(env, lista) {
  lista = sanear(limpar(lista));
  const agora = new Date().toISOString();
  await env.OFERTAS.put("produtos", JSON.stringify(lista));
  await env.OFERTAS.put("atualizado", agora);
  return { ok: true, produtos: lista, total: lista.filter((p) => !p.oculto).length, pendentes: lista.filter((p) => p.oculto).length, atualizado: agora };
}

export async function onRequestGet({ request, env }) {
  if (!env.OFERTAS) return json({ produtos: null, configurado: false });
  const { lista, atualizado } = await ler(env);
  if (new URL(request.url).searchParams.get("todos")) {
    if (!env.ADMIN_SENHA) return json({ erro: "Não configurado." }, 503);
    if (!(await senhaOk(request, env))) return json({ erro: "Senha incorreta." }, 401);
    return json({ produtos: sanear(lista), atualizado, configurado: true });
  }
  return json({ produtos: lista.length ? publica(lista) : null, atualizado, configurado: !!env.ADMIN_SENHA });
}

export async function onRequestPost({ request, env }) {
  if (!env.OFERTAS || !env.ADMIN_SENHA) return json({ erro: "Publicação ainda não configurada na Cloudflare (KV OFERTAS ou ADMIN_SENHA)." }, 503);
  if (!(await senhaOk(request, env))) return json({ erro: "Senha incorreta." }, 401);
  try {
    const texto = await request.text();
    if (texto.length > 1500000) throw new Error("Lista grande demais.");
    const corpo = JSON.parse(texto);
    if (Array.isArray(corpo)) return json(await gravar(env, corpo)); // restaurar cópia completa

    const { lista } = await ler(env);
    if (corpo.op === "salvar") {
      const p = Object.assign({}, corpo.produto || {});
      if (corpo.pendente) p.oculto = true; else delete p.oculto;
      const pos = lista.findIndex((x) => x.id === (corpo.idAntigo || p.id));
      const outros = lista.filter((_, i) => i !== pos);
      let base = p.id, id = base, n = 2;
      while (outros.some((x) => x.id === id)) id = (base + "-" + n++).slice(0, 80);
      p.id = id;
      if (pos >= 0) lista[pos] = p; else lista.unshift(p);
    } else if (corpo.op === "apagar") {
      const pos = lista.findIndex((x) => x.id === corpo.id);
      if (pos >= 0) lista.splice(pos, 1);
    } else if (corpo.op === "publicar") {
      const ids = Array.isArray(corpo.ids) ? corpo.ids : null;
      lista.forEach((x) => { if (!ids || ids.includes(x.id)) delete x.oculto; });
    } else throw new Error("Operação desconhecida.");
    return json(await gravar(env, lista));
  } catch (e) {
    return json({ erro: String(e.message || e) }, 400);
  }
}
