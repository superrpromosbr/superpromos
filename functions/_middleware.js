/* Quem abrir o endereço provisório (superpromos.pages.dev) é levado ao endereço oficial do site.
   Assim só existe um painel e um endereço para compartilhar. */
const OFICIAL = "https://superrpromosbr.com.br";
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === "superpromos.pages.dev") return Response.redirect(OFICIAL + url.pathname + url.search, 301);
  return next();
}
