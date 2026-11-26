/* =========================================================
   CONFIGURAÇÕES DO SITE — edite aqui
   ========================================================= */
window.SITE = {
  nome: "Super Promos BR",
  slogan: "As melhores ofertas da Amazon, escolhidas a dedo",
  // Endereço final do site (troque quando tiver o domínio). Sem barra no final.
  url: "https://superpromosbr.com.br",
  // Seu ID de Associado Amazon (tag). Todo link para a Amazon recebe essa tag.
  tagAmazon: "zerumigo0d-20",
  instagram: "https://www.instagram.com/superrpromosbr/",
  discord: "",          // ex.: "https://discord.gg/seuconvite" (deixe vazio para esconder)
  whatsapp: "",         // ex.: "https://chat.whatsapp.com/..." (deixe vazio para esconder)
  emailContato: "",     // ex.: "contato@superpromosbr.com.br"
  // Logo: troque o arquivo assets/img/logo.png pela logo do Instagram
  // (se o PNG não existir, o site usa o logo.svg provisório)
  logo: "assets/img/logo.png",
  logoReserva: "assets/img/logo.svg",
  // Modo padrão do painel de postagem: false = manual (sem API), true = com a API da Amazon.
  // Você também pode trocar direto no painel (admin.html > Configurações).
  modoApi: false,
  // Preço digitado à mão some sozinho depois de X horas (vira "Ver preço na Amazon"),
  // para nunca mostrar preço desatualizado — regra da Amazon.
  horasValidadePrecoManual: 24
};
