/* hqMetrix site behaviour: renders the shared header/footer from menu.js, then wires up menus, tabs and chart tooltips. */
(function () {
  var HQ = window.HQ, root = document.body.getAttribute('data-root') || '', path = location.pathname;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function link(dir, file) { return root + dir + '/' + file + '.html'; }
  function here(dir, file) { return path.slice(-(dir.length + file.length + 7)) === '/' + dir + '/' + file + '.html'; }

  var items = HQ.menu.map(function (g) {
    var cur = g.items.some(function (i) { return here(g.dir, i[0]); });
    var links = g.items.map(function (i) {
      return '<a href="' + link(g.dir, i[0]) + '"' + (here(g.dir, i[0]) ? ' aria-current="page"' : '') + '>' + esc(i[1]) + '</a>';
    }).join('');
    return '<li class="dd"><button' + (cur ? ' class="cur"' : '') + ' aria-expanded="false">' + esc(g.label) + '<span class="car">▾</span></button><div class="menu">' + links + '</div></li>';
  }).join('');
  var hd = document.getElementById('site-header');
  if (hd) hd.outerHTML =
    '<header class="top"><div class="wrap bar"><a class="brand" href="' + root + 'index.html"><img src="' + root + 'assets/img/logo.svg" alt="hqMetrix"></a>' +
    '<button class="burger" aria-label="Menu" aria-expanded="false">☰</button>' +
    '<nav class="main" aria-label="Primary"><ul>' + items + '</ul><a class="btn sm" href="' + link('about', 'contact') + '">Request a demo</a></nav></div></header>';

  var cols = HQ.menu.map(function (g) {
    return '<div><h4>' + esc(g.label) + '</h4>' + g.items.map(function (i) { return '<a href="' + link(g.dir, i[0]) + '">' + esc(i[1]) + '</a>'; }).join('') + '</div>';
  }).join('');
  var ft = document.getElementById('site-footer');
  if (ft) ft.outerHTML =
    '<footer class="foot"><div class="wrap"><div class="fcols">' + cols + '</div><div class="fbar"><div><img src="' + root + 'assets/img/logo.svg" alt="hqMetrix" height="40"><br>' +
    esc(HQ.contact.address) + '<br>' + esc(HQ.contact.phone) + ' · <a href="mailto:' + HQ.contact.email + '">' + esc(HQ.contact.email) + '</a></div>' +
    '<div class="fl"><a href="' + link('about', 'contact') + '">Contact</a><a href="' + link('about', 'careers') + '">Careers</a><a href="' + link('legal', 'privacy') + '">Privacy Policy</a><a href="#top">Back to top ↑</a></div></div>' +
    '<p class="fine">' + esc(HQ.footnote) + '</p></div></footer>';

  var dds = document.querySelectorAll('.dd');
  dds.forEach(function (d) {
    d.querySelector('button').addEventListener('click', function (ev) {
      var open = d.classList.contains('open');
      dds.forEach(function (x) { x.classList.remove('open'); x.querySelector('button').setAttribute('aria-expanded', 'false'); });
      if (!open) { d.classList.add('open'); ev.currentTarget.setAttribute('aria-expanded', 'true'); }
    });
  });
  document.addEventListener('click', function (ev) { if (!ev.target.closest('.dd')) dds.forEach(function (x) { x.classList.remove('open'); }); });
  var b = document.querySelector('.burger'), m = document.querySelector('.main');
  if (b) b.addEventListener('click', function () { var o = m.classList.toggle('open'); b.setAttribute('aria-expanded', o ? 'true' : 'false'); });

  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
      document.querySelectorAll('.pane').forEach(function (x) { x.classList.remove('on'); });
      t.classList.add('on'); document.getElementById(t.dataset.t).classList.add('on');
    });
  });

  /* chart tooltips: any element with data-tip */
  var tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip);
  function show(ev) {
    var t = ev.target.closest && ev.target.closest('[data-tip]');
    if (!t) { tip.style.display = 'none'; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.style.display = 'block';
    var x = ev.clientX + 14, y = ev.clientY + 14;
    if (x + tip.offsetWidth > window.innerWidth - 8) x = ev.clientX - tip.offsetWidth - 14;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  document.addEventListener('mousemove', show);
  document.addEventListener('click', show);
  document.addEventListener('mouseleave', function () { tip.style.display = 'none'; });
})();
