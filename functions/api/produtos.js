/*
  CONEXÃO COM A API OFICIAL DA AMAZON (Creators API)
  ---------------------------------------------------
  Só é usada no "Modo API". Roda no servidor da Cloudflare Pages
  (Pages Functions) — suas chaves NUNCA aparecem para o visitante.

  Configure na Cloudflare: seu projeto > Settings > Variables and Secrets
    CREATORS_CLIENT_ID      -> Credential ID gerado em Associados > Ferramentas > Creators API
    CREATORS_CLIENT_SECRET  -> Credential Secret (marque como "Secret")
    AMAZON_TAG              -> zerumigo0d-20 (opcional; esse já é o padrão)

  Rotas:
    GET /api/produtos?status=1         -> diz se as chaves estão configuradas
    GET /api/produtos?asins=B0X,B0Y    -> dados de até 10 produtos (título, imagem, preço, link)
*/
const TOKEN_URL = "https://api.amazon.com/auth/o2/token";      // região NA (inclui Brasil)
const API_URL = "https://creatorsapi.amazon/catalog/v1/getItems";
const MARKETPLACE = "www.amazon.com.br";
const CACHE_SEGUNDOS = 1800; // 30 min: preço sempre com menos de 1h

let tokenCache = { valor: null, expira: 0 };

async function pegarToken(env) {
  if (tokenCache.valor && Date.now() < tokenCache.expira) return tokenCache.valor;
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: env.CREATORS_CLIENT_ID,
      client_secret: env.CREATORS_CLIENT_SECRET,
      scope: "creatorsapi::default"
    })
  });
  if (!r.ok) throw new Error("Falha ao autenticar na Amazon (" + r.status + "): " + (await r.text()).slice(0, 300));
  const j = await r.json();
  tokenCache = { valor: j.access_token, expira: Date.now() + ((j.expires_in || 3600) - 120) * 1000 };
  return tokenCache.valor;
}

function simplificar(item) {
  const listing = (((item.offersV2 || {}).listings) || [])[0] || {};
  const preco = listing.price || {};
  const money = preco.money || {};
  const base = (preco.savingBasis || {}).money || {};
  const savings = preco.savings || {};
  const img = ((item.images || {}).primary || {});
  return {
    asin: item.asin,
    titulo: ((item.itemInfo || {}).title || {}).displayValue || "",
    imagem: (img.large || img.medium || img.small || {}).url || "",
    preco: money.displayAmount || "",
    precoAntigo: base.displayAmount || "",
    desconto: savings.percentage || 0,
    link: item.detailPageURL || ""
  };
}

function json(dados, status, cacheSeg) {
  return new Response(JSON.stringify(dados), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheSeg ? "public, max-age=300, s-maxage=" + cacheSeg : "no-store"
    }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const configurado = !!(env.CREATORS_CLIENT_ID && env.CREATORS_CLIENT_SECRET);

  if (url.searchParams.get("status")) return json({ configurado });
  if (!configurado) return json({ erro: "API não configurada. Adicione CREATORS_CLIENT_ID e CREATORS_CLIENT_SECRET na Cloudflare." }, 503);

  const asins = (url.searchParams.get("asins") || "")
    .split(",").map((s) => s.trim().toUpperCase()).filter((s) => /^[A-Z0-9]{10}$/.test(s));
  const unicos = [...new Set(asins)].slice(0, 10);
  if (!unicos.length) return json({ erro: "Informe ?asins=CODIGO (até 10, separados por vírgula)." }, 400);

  // cache na borda da Cloudflare (economiza chamadas à Amazon)
  const cache = caches.default;
  const chave = new Request(url.origin + "/api/produtos?asins=" + unicos.sort().join(","));
  const emCache = await cache.match(chave);
  if (emCache) return emCache;

  try {
    const token = await pegarToken(env);
    const tag = env.AMAZON_TAG || "zerumigo0d-20";
    const r = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
        "x-marketplace": MARKETPLACE
      },
      body: JSON.stringify({
        itemIds: unicos,
        itemIdType: "ASIN",
        marketplace: MARKETPLACE,
        partnerTag: tag,
        resources: ["itemInfo.title", "images.primary.large", "offersV2.listings.price"]
      })
    });
    const texto = await r.text();
    if (!r.ok) return json({ erro: "A Amazon recusou o pedido (" + r.status + ")", detalhe: texto.slice(0, 500) }, 502);
    const j = JSON.parse(texto);
    const itens = (((j.itemResults || {}).items) || []).map(simplificar);
    const resp = json({ atualizadoEm: new Date().toISOString(), itens, erros: j.errors || [] }, 200, CACHE_SEGUNDOS);
    context.waitUntil(cache.put(chave, resp.clone()));
    return resp;
  } catch (e) {
    return json({ erro: String(e.message || e) }, 500);
  }
}
