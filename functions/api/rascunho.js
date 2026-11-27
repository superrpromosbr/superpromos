/*
  RASCUNHO DO PAINEL (ofertas ainda não publicadas), sincronizado entre aparelhos.
  Tudo aqui exige a senha do painel (cabeçalho x-senha).
  GET    /api/rascunho -> { lista, t }
  POST   /api/rascunho -> salva { lista, t }
  DELETE /api/rascunho -> apaga (depois de publicar)
*/
function json(d, s) {
  return new Response(JSON.stringify(d), { status: s || 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
function iguais(a, b) {
  a = String(a || ""); b = String(b || "");
  let dif = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) dif |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return dif === 0;
}
async function autorizado(request, env) {
  if (!env.OFERTAS || !env.ADMIN_SENHA) return json({ erro: "Não configurado." }, 503);
  if (!iguais(request.headers.get("x-senha"), env.ADMIN_SENHA)) {
    await new Promise((r) => setTimeout(r, 800));
    return json({ erro: "Senha incorreta." }, 401);
  }
  return null;
}

export async function onRequestGet({ request, env }) {
  const erro = await autorizado(request, env); if (erro) return erro;
  const v = await env.OFERTAS.get("rascunho");
  return json(v ? JSON.parse(v) : { lista: null, t: 0 });
}

export async function onRequestPost({ request, env }) {
  const erro = await autorizado(request, env); if (erro) return erro;
  const texto = await request.text();
  if (texto.length > 1500000) return json({ erro: "Rascunho grande demais." }, 400);
  let d;
  try { d = JSON.parse(texto); } catch (e) { return json({ erro: "JSON inválido." }, 400); }
  if (!Array.isArray(d.lista)) return json({ erro: "Lista inválida." }, 400);
  await env.OFERTAS.put("rascunho", JSON.stringify({ lista: d.lista, t: Number(d.t) || Date.now() }));
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const erro = await autorizado(request, env); if (erro) return erro;
  await env.OFERTAS.delete("rascunho");
  return json({ ok: true });
}
