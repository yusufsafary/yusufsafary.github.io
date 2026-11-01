(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const N = window.Nomio;
  const fmt = (x) => Number(x).toLocaleString('en-US');
  const css = getComputedStyle(document.documentElement);
  const INK = '#17161A', ACC = '#D8432A';
  const NICE = [30, 45, 73, 86, 89, 90, 105, 110, 124, 137, 150, 54, 57, 18, 22, 126, 146, 182, 193, 225, 169, 106];

  function step(row, rule) {
    const n = row.length, out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = (rule >> ((row[(i - 1 + n) % n] << 2) | (row[i] << 1) | row[(i + 1) % n])) & 1;
    return out;
  }

  // ---------- hero field: a law writing itself ----------
  const cv = $('field'), cx = cv.getContext('2d');
  let cell, cols, rows, grid = [], rule = 110, tick = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
  function sizeField() {
    const r = cv.getBoundingClientRect();
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    cell = Math.max(5, Math.round(Math.min(r.width, 900) / 110)) * dpr;
    cols = Math.max(8, Math.ceil(cv.width / cell)); rows = Math.max(8, Math.ceil(cv.height / cell));
    seedField();
  }
  function seedField() {
    grid = []; let row = new Uint8Array(cols);
    if (Math.random() < 0.4) row[cols >> 1] = 1; else for (let i = 0; i < cols; i++) row[i] = Math.random() < 0.5 ? 1 : 0;
    grid.push(row);
    for (let t = 1; t < rows; t++) grid.push(row = step(row, rule));
  }
  function drawField() {
    cx.clearRect(0, 0, cv.width, cv.height);
    const g = cell * 0.12;
    for (let t = 0; t < grid.length; t++) {
      const row = grid[t], prev = grid[t - 1];
      for (let i = 0; i < cols; i++) if (row[i]) {
        cx.fillStyle = prev && !prev[i] && (i * 7 + t) % 11 === 0 ? ACC : INK;
        cx.globalAlpha = 0.18 + 0.82 * (t / grid.length);
        cx.fillRect(i * cell + g / 2, t * cell + g / 2, cell - g, cell - g);
      }
    }
    cx.globalAlpha = 1;
  }
  function animate() {
    if (grid.length < 2) return;
    grid.shift(); grid.push(step(grid[grid.length - 1], rule)); tick++;
    if (tick % 260 === 0) { rule = NICE[Math.floor(Math.random() * NICE.length)]; }
    drawField();
  }
  sizeField(); drawField();
  let fieldTimer = setInterval(animate, 90);
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { sizeField(); drawField(); }, 200); });
  document.addEventListener('visibilitychange', () => { clearInterval(fieldTimer); if (!document.hidden) fieldTimer = setInterval(animate, 90); });

  // ---------- Article I: the rule toy ----------
  let toyRule = 110, single = true, toySeedRow = null;
  const tr = $('toyRule'), tc = $('toyCanvas'), tx = tc.getContext('2d');
  for (let k = 7; k >= 0; k--) {
    const b = document.createElement('button'); b.className = 'cell8'; b.dataset.k = k; b.setAttribute('aria-label', 'Toggle neighbourhood ' + k);
    b.innerHTML = `<span class="top">${[2, 1, 0].map((s) => `<i class="${(k >> s) & 1 ? 'on' : ''}"></i>`).join('')}</span><span class="out"></span>`;
    b.addEventListener('click', () => { toyRule ^= 1 << k; drawToy(); });
    tr.appendChild(b);
  }
  function drawToy() {
    $('toyNum').textContent = toyRule;
    tr.querySelectorAll('.cell8').forEach((b) => b.querySelector('.out').classList.toggle('on', !!((toyRule >> +b.dataset.k) & 1)));
    const w = tc.clientWidth * dpr, h = w / 1.6; tc.width = w; tc.height = h;
    const c = Math.max(2, Math.floor(w / 200)), C = Math.floor(w / c), R = Math.floor(h / c);
    let row = new Uint8Array(C);
    if (single) row[C >> 1] = 1; else { if (!toySeedRow || toySeedRow.length !== C) { toySeedRow = new Uint8Array(C); for (let i = 0; i < C; i++) toySeedRow[i] = Math.random() < 0.5 ? 1 : 0; } row = toySeedRow; }
    tx.fillStyle = INK;
    for (let t = 0; t < R; t++) { for (let i = 0; i < C; i++) if (row[i]) tx.fillRect(i * c, t * c, c, c); row = step(row, toyRule); }
  }
  $('toyRand').addEventListener('click', () => { toyRule = NICE[Math.floor(Math.random() * NICE.length)]; drawToy(); });
  $('toySeed').addEventListener('click', (e) => { single = !single; toySeedRow = null; e.target.textContent = single ? 'Single seed' : 'Random row'; drawToy(); });
  drawToy();

  // ---------- Article II: forms + palettes ----------
  const FORMS = [
    ['Loom', 'A law written row by row, like cloth on a loom.', 'bc2b116f80ae4cfe01fec51c14411b79b74f57b91c67d49c2f9ae297ddca9f44'],
    ['Halo', 'The same law wrapped into rings around a sun.', 'af39e47e62f9454aae0e68e9e10e64d1ecfd57d4908b17e0741d1ff3ccdf8d28'],
    ['Strata', 'Three states instead of two. Rock, sediment, light.', 'e3d0d5a7e0191b9e823d8af472fb7e32922d99ad7381276705ce8e07ed283d49'],
    ['Bloom', 'A two-dimensional law, grown from a symmetric soup.', '252867f8b0bcd1137406873496f3e153b734f3c9f7013e1d0c8456b70e14a9d0'],
  ];
  const fg = $('formGrid');
  FORMS.forEach(([name, line, seed], i) => {
    const el = document.createElement('figure'); el.className = 'form rv';
    el.innerHTML = N.render('0x' + seed, [12, 25, 24, 17][i]).svg + `<figcaption><b>${name}</b><span>${line}</span></figcaption>`;
    fg.appendChild(el);
  });
  const pals = $('pals');
  N.PALETTES.forEach((p) => {
    const el = document.createElement('div'); el.className = 'pal';
    el.innerHTML = `<span class="sw"><i style="background:${p.bg}"></i><i style="background:${p.ink}"></i><i style="background:${p.acc}"></i></span>${p.name}`;
    pals.appendChild(el);
  });

  // ---------- stats ----------
  let minted = -1;
  async function loadStats() {
    try {
      const j = await window.NomioChain.stats();
      if (j.error) return;
      $('barCount').textContent = fmt(j.minted); $('mMinted').textContent = fmt(j.minted);
      $('mLeft').textContent = fmt(j.max - j.minted); $('mFill').style.width = (j.minted / j.max * 100) + '%';
      $('mStatus').textContent = j.minted >= j.max ? 'Complete' : j.open ? 'Mint live' : 'Opening soon';
      if (j.minted !== minted) { minted = j.minted; loadRecent(); }
    } catch (e) {}
  }
  async function loadRecent() {
    try {
      const j = await window.NomioChain.recent();
      if (!j.items || !j.items.length) return;
      const g = $('gallery'); g.innerHTML = '';
      j.items.slice(0, 8).forEach((it) => {
        const a = document.createElement('a'); a.href = `https://nomio-six.vercel.app/api/svg/${it.id}`; a.target = '_blank'; a.rel = 'noopener';
        a.innerHTML = N.render(it.seed, it.id).svg; g.appendChild(a);
      });
    } catch (e) {}
  }
  loadStats(); setInterval(loadStats, 10000);

  // ---------- wallet check ----------
  $('whoBtn').addEventListener('click', async () => {
    const w = $('who').value.trim(), out = $('whoOut');
    if (!/^0x[0-9a-fA-F]{40}$/.test(w)) { out.textContent = 'Enter a full 0x address.'; return; }
    out.textContent = 'Checking…';
    try {
      const j = await window.NomioChain.stats(w);
      out.textContent = j.hasMinted ? 'This wallet already holds its Nomio.' : j.hasAgentId ? 'Eligible. This wallet holds an Agent ID and can mint once.' : 'Not eligible. No Binance Agent ID on this wallet.';
    } catch (e) { out.textContent = 'Could not reach the contract. Try again.'; }
  });

  // ---------- copy + reveal ----------
  document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($(b.dataset.copy).innerText); b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1400); } catch (e) {}
  }));
  document.querySelectorAll('.sec h2, .body, .toy, .ledger, .steps li, .code, details').forEach((el) => el.classList.add('rv'));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.rv').forEach((el) => io.observe(el));
})();
