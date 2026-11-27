/* Super Promos BR — lógica do site (não precisa editar) */
(function () {
  "use strict";
  var S = window.SITE || {};
  var P = (window.PRODUTOS || []).map(function (p) { return Object.assign({}, p); });
  var BASE = document.body.getAttribute("data-base") || "";
  var PAGINA = document.body.getAttribute("data-pagina") || "";
  var AVISO_PRECO = "Os preços e a disponibilidade dos produtos estão corretos na data/horário indicados e estão sujeitos a alterações. Qualquer informação de preço e disponibilidade exibida na Amazon no momento da compra será aplicada à compra deste produto.";

  var EMOJI = {
    "Eletrônicos": "🎧", "Casa e Cozinha": "🍳", "Papelaria": "✏️", "Games": "🎮",
    "Esporte e Lazer": "🏃", "Livros": "📚", "Beleza": "💄", "Moda": "👟",
    "Brinquedos": "🧸", "Ferramentas": "🔧", "Pet Shop": "🐾", "Informática": "💻",
    "Celulares": "📱", "Bebês": "🍼", "Saúde": "💊", "Automotivo": "🚗", "Ofertas": "🔥"
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- Datas e preço ---------- */
  function lerData(v) {
    if (!v) return null;
    var d = new Date(v);
    if (!isNaN(d)) return d;
    var m = String(v).match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2})?:?(\d{2})?/); // 24/11/2026 14:30
    return m ? new Date(+m[3], m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)) : null;
  }
  function fmtData(d) {
    function z(n) { return (n < 10 ? "0" : "") + n; }
    return z(d.getDate()) + "/" + z(d.getMonth() + 1) + "/" + d.getFullYear() + " às " + z(d.getHours()) + ":" + z(d.getMinutes());
  }
  /* Só mostra preço se tiver data/hora e estiver dentro da validade */
  function precoValido(p) {
    if (!p.preco) return false;
    var d = lerData(p.atualizadoEm);
    if (!d) return false;
    if (p.api) return true; // veio da API agora
    var horas = (Date.now() - d.getTime()) / 36e5;
    return horas < (S.horasValidadePrecoManual || 24);
  }

  /* ---------- Links ---------- */
  function linkAmazon(p) {
    if (p.linkApi) return p.linkApi; // link oficial devolvido pela API (não editar)
    var tag = S.tagAmazon;
    if (p.asin) return "https://www.amazon.com.br/dp/" + encodeURIComponent(p.asin.trim()) + "?tag=" + tag;
    try {
      var u = new URL(p.url);
      // links curtos amzn.to já trazem a tag dentro; os demais recebem a sua tag
      if (/(^|\.)amazon\.com\.br$/.test(u.hostname)) u.searchParams.set("tag", tag);
      return u.toString();
    } catch (e) { return "https://www.amazon.com.br/?tag=" + tag; }
  }
  function linkInterno(p) { return BASE + "produto.html?id=" + encodeURIComponent(p.id); }
  function enderecoSite() { return /^https?:$/.test(location.protocol) && !/localhost|127\.0\.0\.1/.test(location.hostname) ? location.origin : (S.url || ""); }
  function linkPublico(p) { return enderecoSite() + "/p/" + p.id; }

  /* ---------- Modo API: busca dados atualizados ---------- */
  function carregarApi() {
    var comApi = P.filter(function (p) { return p.api && p.asin; });
    if (!comApi.length || location.protocol === "file:") return Promise.resolve();
    var lotes = [];
    for (var i = 0; i < comApi.length; i += 10) lotes.push(comApi.slice(i, i + 10));
    return Promise.all(lotes.map(function (lote) {
      var asins = lote.map(function (p) { return p.asin; }).join(",");
      return fetch(BASE + "api/produtos?asins=" + asins).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (!j || !j.itens) return;
          j.itens.forEach(function (it) {
            P.forEach(function (p) {
              if (!p.api || p.asin !== it.asin) return;
              if (it.titulo && !p.tituloFixo) p.titulo = it.titulo;
              if (it.imagem) p.imagem = it.imagem;
              if (it.link) p.linkApi = it.link;
              if (it.preco) { p.preco = it.preco; p.atualizadoEm = j.atualizadoEm; }
              if (it.precoAntigo && it.precoAntigo !== it.preco) p.precoAntigo = it.precoAntigo;
              if (it.desconto && !p.selo) p.selo = "-" + it.desconto + "%";
            });
          });
        }).catch(function () {});
    }));
  }

  /* ---------- Pedaços de HTML ---------- */
  function foto(p) {
    var emoji = EMOJI[p.categoria] || "🛍️";
    var ph = '<div class="placeholder" aria-hidden="true">' + emoji + "</div>";
    if (!p.imagem) return ph;
    return '<img src="' + esc(p.imagem) + '" alt="' + esc(p.titulo) +
      '" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML=\'' + ph.replace(/"/g, "&quot;") + '\'">';
  }

  function blocoPreco(p, grande) {
    if (precoValido(p)) {
      var d = lerData(p.atualizadoEm);
      return (p.precoAntigo ? '<div class="preco-antigo">' + esc(p.precoAntigo) + "</div>" : "") +
        '<div class="preco">' + esc(p.preco) + "</div>" +
        (grande ? "" : '<div class="hora-preco" title="' + esc(AVISO_PRECO) + '">em ' + fmtData(d) + " ⓘ</div>");
    }
    return '<span class="ver-preco">' + (grande ? "Confira o preço atualizado na Amazon" : "Ver preço na Amazon") + "</span>";
  }

  function card(p) {
    return '<a class="card" href="' + linkInterno(p) + '">' +
      '<div class="foto">' + (p.selo ? '<span class="selo">' + esc(p.selo) + "</span>" : "") + foto(p) + "</div>" +
      '<div class="info"><span class="cat">' + esc(p.categoria || "Ofertas") + "</span>" +
      "<h3>" + esc(p.titulo) + "</h3>" +
      '<div class="rodape-card"><div>' + blocoPreco(p) + '</div><span class="seta">›</span></div>' +
      "</div></a>";
  }

  /* ---------- Topo e rodapé ---------- */
  function montarTopo() {
    var el = document.getElementById("topo");
    if (!el) return;
    var q = new URLSearchParams(location.search).get("q") || "";
    el.innerHTML =
      '<div class="container">' +
      '<a class="marca" href="' + BASE + 'index.html"><img src="' + BASE + S.logo + '" alt="" onerror="this.onerror=null;this.src=\'' + BASE + S.logoReserva + '\'"><span>' +
      esc(S.nome).replace(/(Promos)/, "<b>$1</b>") + "</span></a>" +
      '<form class="busca" action="' + BASE + 'index.html" role="search"><input name="q" type="search" placeholder="Buscar ofertas…" value="' + esc(q) + '" aria-label="Buscar"><button type="submit">Buscar</button></form>' +
      '<button class="menu-btn" aria-label="Menu" onclick="document.querySelector(\'.nav\').classList.toggle(\'aberto\')">☰</button>' +
      '<nav class="nav">' +
      '<a href="' + BASE + 'index.html"' + (PAGINA === "inicio" ? ' class="ativo"' : "") + ">Início</a>" +
      '<a href="' + BASE + 'index.html#todas">Ofertas</a>' +
      '<a href="' + BASE + 'sobre.html"' + (PAGINA === "sobre" ? ' class="ativo"' : "") + ">Sobre</a>" +
      (S.instagram ? '<a href="' + esc(S.instagram) + '" target="_blank" rel="noopener">Instagram</a>' : "") +
      "</nav></div>";
  }

  function montarRodape() {
    var el = document.getElementById("rodape");
    if (!el) return;
    var redes = "";
    if (S.instagram) redes += '<a href="' + esc(S.instagram) + '" target="_blank" rel="noopener">Instagram</a>';
    if (S.discord) redes += '<a href="' + esc(S.discord) + '" target="_blank" rel="noopener">Discord</a>';
    if (S.whatsapp) redes += '<a href="' + esc(S.whatsapp) + '" target="_blank" rel="noopener">WhatsApp</a>';
    if (S.emailContato) redes += '<a href="mailto:' + esc(S.emailContato) + '">' + esc(S.emailContato) + "</a>";
    el.innerHTML =
      '<div class="container"><div class="colunas">' +
      "<div><h4>" + esc(S.nome) + "</h4><p>" + esc(S.slogan) + ". Selecionamos produtos e você finaliza a compra com segurança no site da Amazon.</p></div>" +
      '<div><h4>Institucional</h4><a href="' + BASE + 'sobre.html">Sobre nós</a><a href="' + BASE + 'privacidade.html">Política de Privacidade</a><a href="' + BASE + 'termos.html">Termos de Uso</a></div>' +
      "<div><h4>Siga a gente</h4>" + redes + "</div>" +
      '</div><div class="divulgacao">' +
      "<strong>Como participante do Programa de Associados da Amazon, sou remunerado pelas compras qualificadas efetuadas.</strong> " +
      AVISO_PRECO + " " +
      "Amazon, Amazon.com.br e o logotipo da Amazon são marcas comerciais da Amazon.com, Inc. ou de suas afiliadas. As demais marcas pertencem aos seus respectivos donos. " +
      "<br>© " + new Date().getFullYear() + " " + esc(S.nome) + ". Todos os direitos reservados." +
      "</div></div>";
  }

  /* ---------- Página inicial ---------- */
  function paginaInicial() {
    var params = new URLSearchParams(location.search);
    var busca = (params.get("q") || "").trim().toLowerCase();
    var catAtiva = params.get("cat") || "Todas";

    var cats = ["Todas"];
    P.forEach(function (p) { var c = p.categoria || "Ofertas"; if (cats.indexOf(c) < 0) cats.push(c); });

    var chipsEl = document.getElementById("chips");
    function desenharChips() {
      chipsEl.innerHTML = cats.map(function (c) {
        return '<button class="chip' + (c === catAtiva ? " ativo" : "") + '" data-cat="' + esc(c) + '">' +
          (c === "Todas" ? "🔥 " : (EMOJI[c] ? EMOJI[c] + " " : "")) + esc(c) + "</button>";
      }).join("");
    }
    chipsEl.onclick = function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      catAtiva = b.getAttribute("data-cat");
      var u = new URL(location.href);
      if (catAtiva === "Todas") u.searchParams.delete("cat"); else u.searchParams.set("cat", catAtiva);
      history.replaceState(null, "", u);
      desenharChips(); desenharLista();
      document.getElementById("todas").scrollIntoView({ behavior: "smooth", block: "start" });
    };

    var ordenados = P.slice().sort(function (a, b) { return (b.data || "").localeCompare(a.data || ""); });
    var dest = ordenados.filter(function (p) { return p.destaque; });
    var destEl = document.getElementById("destaques");
    if (dest.length && !busca) { destEl.innerHTML = dest.slice(0, 6).map(card).join(""); document.getElementById("secao-destaques").style.display = ""; }
    else document.getElementById("secao-destaques").style.display = "none";

    function desenharLista() {
      var lista = ordenados.filter(function (p) {
        var okCat = catAtiva === "Todas" || (p.categoria || "Ofertas") === catAtiva;
        var texto = (p.titulo + " " + (p.categoria || "") + " " + (p.descricao || "")).toLowerCase();
        return okCat && (!busca || texto.indexOf(busca) >= 0);
      });
      document.getElementById("titulo-lista").textContent =
        busca ? 'Resultados para "' + params.get("q") + '"' : (catAtiva === "Todas" ? "Todas as ofertas" : catAtiva);
      document.getElementById("contagem").textContent = lista.length + (lista.length === 1 ? " produto" : " produtos");
      document.getElementById("lista").innerHTML = lista.length ? lista.map(card).join("") :
        '<div class="vazio" style="grid-column:1/-1">Nenhum produto encontrado. <a href="' + BASE + 'index.html" style="color:var(--cor-primaria);font-weight:700">Ver todas as ofertas</a></div>';
    }
    desenharChips(); desenharLista();
  }

  /* ---------- Página de produto ---------- */
  function paginaProduto() {
    var id = document.body.getAttribute("data-id") || new URLSearchParams(location.search).get("id");
    var p = P.filter(function (x) { return x.id === id; })[0];
    var alvo = document.getElementById("produto");
    if (!p) {
      alvo.innerHTML = '<div class="vazio" style="grid-column:1/-1"><h2>Oferta não encontrada 😕</h2><p>Ela pode ter acabado. Veja as outras ofertas disponíveis.</p><a class="btn btn-amazon" style="max-width:280px;margin:auto" href="' + BASE + 'index.html">Ver ofertas</a></div>';
      return;
    }
    document.title = p.titulo + " | " + S.nome;
    var cat = p.categoria || "Ofertas";
    var temPreco = precoValido(p);
    var avisoPreco = temPreco
      ? "Preço conferido em " + fmtData(lerData(p.atualizadoEm)) + ". " + AVISO_PRECO
      : "Preço e estoque podem mudar a qualquer momento.";

    document.getElementById("migalhas").innerHTML =
      '<a href="' + BASE + 'index.html">Início</a> › <a href="' + BASE + "index.html?cat=" + encodeURIComponent(cat) + '#todas">' + esc(cat) + "</a> › Amazon";

    alvo.innerHTML =
      '<div class="galeria">' + (p.selo ? '<span class="selo">' + esc(p.selo) + "</span>" : "") + foto(p) + "</div>" +
      "<div>" +
      '<span class="tag-parceria">#publi · link de associado</span>' +
      "<h1>" + esc(p.titulo) + "</h1>" +
      '<span class="loja">Compra feita no site da <b>Amazon.com.br</b></span>' +
      '<div class="caixa-preco">' + blocoPreco(p, true) + '<div class="aviso-preco">' + avisoPreco + "</div></div>" +
      (p.cupom ? '<div class="cupom"><span>Cupom:</span><code>' + esc(p.cupom) + '</code><button class="btn btn-sec" data-copiar="' + esc(p.cupom) + '">Copiar</button></div>' : "") +
      (p.descricao ? '<p class="descricao">' + esc(p.descricao) + "</p>" : "") +
      '<a class="btn btn-amazon" href="' + esc(linkAmazon(p)) + '" target="_blank" rel="sponsored noopener">Comprar na Amazon →</a>' +
      '<p class="seguro">🔒 Você finaliza a compra com segurança no site oficial da Amazon.</p>' +
      '<div class="compartilhar">' +
      '<button class="btn btn-sec" data-copiar="' + esc(linkPublico(p)) + '">🔗 Copiar link</button>' +
      '<a class="btn btn-sec" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(p.titulo + " " + linkPublico(p)) + '">💬 WhatsApp</a>' +
      "</div></div>";

    var rel = P.filter(function (x) { return x.id !== p.id && (x.categoria || "Ofertas") === cat; });
    if (rel.length < 4) rel = rel.concat(P.filter(function (x) { return x.id !== p.id && (x.categoria || "Ofertas") !== cat; }));
    document.getElementById("relacionados").innerHTML = rel.slice(0, 4).map(card).join("");
  }

  /* ---------- Copiar + aviso ---------- */
  function toast(msg) {
    var t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("mostrar");
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("mostrar"); }, 2200);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copiar]"); if (!b) return;
    var txt = b.getAttribute("data-copiar");
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast("Copiado! ✅"); }, function () { prompt("Copie:", txt); });
    else prompt("Copie:", txt);
  });

  function renderizar() {
    if (PAGINA === "inicio") paginaInicial();
    if (PAGINA === "produto") paginaProduto();
  }

  /* Lista publicada pelo botão "Publicar" do painel (se existir). Senão usa products.js */
  function carregarLista() {
    if (location.protocol === "file:" || PAGINA === "admin") return Promise.resolve();
    var pedido = fetch(BASE + "api/ofertas", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && Array.isArray(j.produtos)) P = j.produtos.map(function (p) { return Object.assign({}, p); });
      }).catch(function () {});
    return Promise.race([pedido, new Promise(function (r) { setTimeout(r, 3000); })]);
  }

  montarTopo(); montarRodape();
  carregarLista().then(function () {
    renderizar();
    return carregarApi();               // atualiza com preços da API, se houver
  }).then(function () {
    if (P.some(function (p) { return p.api; })) renderizar();
  });

  window.SuperPromos = { enderecoSite: enderecoSite, linkAmazon: linkAmazon, toast: toast, precoValido: precoValido, fmtData: fmtData, lerData: lerData };
})();
