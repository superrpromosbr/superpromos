/* =========================================================
   LISTA DE PRODUTOS
   Dica: use o painel admin.html para gerar este arquivo sem
   precisar editar à mão.

   Campos:
   id          -> nome curto do link (vira seusite.com.br/p/ID). Só letras minúsculas, números e hífen.
   titulo      -> nome do produto
   categoria   -> uma das categorias (aparece nos filtros)
   asin        -> código do produto na Amazon (ex.: B0FMFTWHJJ). O link é montado com sua tag.
   url         -> (opcional) use no lugar do ASIN um link completo da Amazon; a tag é adicionada sozinha.
   imagem      -> (opcional) link da imagem (SiteStripe da Amazon ou sua própria foto)
   descricao   -> seu texto sobre o produto (conteúdo original seu)
   destaque    -> true para aparecer em "Ofertas em destaque"
   selo        -> (opcional) etiqueta curta: "Mais vendido", "Oferta", "-30%"
   cupom       -> (opcional) código de cupom
   data        -> data em que você publicou (AAAA-MM-DD)

   PREÇOS: a Amazon só permite mostrar preço se ele vier da API oficial
   ou se você atualizar com data/hora. Por segurança, o site mostra
   "Ver preço na Amazon". Se quiser exibir, preencha preco, precoAntigo e
   atualizadoEm ("2026-11-24 14:30") — o aviso exigido aparece sozinho.
   ========================================================= */
window.PRODUTOS = [
  {
    id: "fone-bluetooth",
    titulo: "Fones de ouvido Bluetooth com cancelamento de ruído",
    categoria: "Eletrônicos",
    url: "https://www.amazon.com.br/s?k=fone+bluetooth+cancelamento+de+ruido",
    imagem: "",
    descricao: "Produto de EXEMPLO. Substitua por um produto real no painel admin. Fones sem fio com boa bateria e cancelamento de ruído para trabalhar, estudar ou viajar.",
    destaque: true,
    selo: "Exemplo",
    data: "2026-11-24"
  },
  {
    id: "smartwatch",
    titulo: "Smartwatch com monitor de batimentos e notificações",
    categoria: "Eletrônicos",
    url: "https://www.amazon.com.br/s?k=smartwatch",
    descricao: "Produto de EXEMPLO. Relógio inteligente para acompanhar treinos, sono e notificações do celular.",
    destaque: true,
    selo: "Exemplo",
    data: "2026-11-24"
  },
  {
    id: "air-fryer",
    titulo: "Air Fryer 4L — fritadeira elétrica sem óleo",
    categoria: "Casa e Cozinha",
    url: "https://www.amazon.com.br/s?k=air+fryer",
    descricao: "Produto de EXEMPLO. Prepare batata, frango e pão de queijo sem óleo e em poucos minutos.",
    destaque: true,
    selo: "Exemplo",
    data: "2026-11-24"
  },
  {
    id: "kit-canetas",
    titulo: "Kit de canetas coloridas ponta fina — 24 cores",
    categoria: "Papelaria",
    url: "https://www.amazon.com.br/s?k=kit+canetas+coloridas+ponta+fina",
    descricao: "Produto de EXEMPLO. Ideal para cadernos, planners e lettering.",
    destaque: false,
    data: "2026-11-24"
  },
  {
    id: "mouse-gamer",
    titulo: "Mouse gamer RGB com 6 botões programáveis",
    categoria: "Games",
    url: "https://www.amazon.com.br/s?k=mouse+gamer",
    descricao: "Produto de EXEMPLO. Sensor preciso, iluminação RGB e botões laterais para jogos.",
    destaque: false,
    cupom: "",
    data: "2026-11-24"
  },
  {
    id: "garrafa-termica",
    titulo: "Garrafa térmica inox 1L — mantém gelado por 24h",
    categoria: "Esporte e Lazer",
    url: "https://www.amazon.com.br/s?k=garrafa+termica+inox",
    descricao: "Produto de EXEMPLO. Garrafa de aço inox que mantém a bebida gelada ou quente por horas.",
    destaque: false,
    data: "2026-11-24"
  },
  {
    id: "kindle",
    titulo: "Leitor de livros digitais (e-reader)",
    categoria: "Livros",
    url: "https://www.amazon.com.br/s?k=kindle",
    descricao: "Produto de EXEMPLO. Tela que não cansa a vista e bateria que dura semanas.",
    destaque: false,
    data: "2026-11-24"
  },
  {
    id: "kit-skincare",
    titulo: "Kit skincare — limpeza, hidratação e protetor",
    categoria: "Beleza",
    url: "https://www.amazon.com.br/s?k=kit+skincare",
    descricao: "Produto de EXEMPLO. Rotina completa de cuidados com a pele.",
    destaque: false,
    data: "2026-11-24"
  }
];
