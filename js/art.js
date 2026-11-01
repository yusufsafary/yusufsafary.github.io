// Nomio — every token is a small law (a cellular-automaton rule) and the world it grows.
// Deterministic from a uint256 seed. Same code runs in Node (API) and in the browser.
(function (root) {
  'use strict';

  function sfc32(a, b, c, d) {
    return function () {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9); b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11); d = (d + 1) | 0;
      t = (t + d) | 0; c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }
  function rngFrom(seedHex) {
    const h = String(seedHex).replace(/^0x/, '').padStart(64, '0').slice(-64);
    const p = [0, 1, 2, 3].map((i) => parseInt(h.slice(i * 8, i * 8 + 8), 16) ^ parseInt(h.slice(32 + i * 8, 40 + i * 8), 16));
    const r = sfc32(p[0], p[1], p[2], p[3]);
    for (let i = 0; i < 32; i++) r();
    return r;
  }
  const pickW = (rand, items) => { let t = 0; items.forEach((x) => (t += x[1])); let v = rand() * t; for (const x of items) { v -= x[1]; if (v <= 0) return x[0]; } return items[items.length - 1][0]; };
  const pick = (rand, a) => a[Math.floor(rand() * a.length)];
  const f = (n) => Math.round(n * 100) / 100;

  // ---------- palettes ----------
  const PALETTES = [
    { name: 'Archive', bg: '#EEE8DC', ink: '#17161A', acc: '#D8432A', sub: '#8C8578', w: 14 },
    { name: 'Riso', bg: '#F3EEE5', ink: '#2B3CC0', acc: '#FF4F86', sub: '#9AA0D8', w: 11 },
    { name: 'Indigo', bg: '#E7E3D8', ink: '#1C2742', acc: '#C49A22', sub: '#8E92A0', w: 10 },
    { name: 'Moss', bg: '#E8E5D6', ink: '#27331F', acc: '#B4552F', sub: '#8F9583', w: 9 },
    { name: 'Saffron', bg: '#F2E2C0', ink: '#2A1A11', acc: '#E06A16', sub: '#A89270', w: 8 },
    { name: 'Sakura', bg: '#F5E8E4', ink: '#3A1D2A', acc: '#DD5878', sub: '#B9A0A4', w: 7 },
    { name: 'Noir', bg: '#0F0F11', ink: '#ECE5D6', acc: '#FF4A2A', sub: '#4A4744', w: 10 },
    { name: 'Cobalt', bg: '#0B1031', ink: '#9DBBFF', acc: '#FFD15C', sub: '#2C3A72', w: 8 },
    { name: 'Phosphor', bg: '#08100A', ink: '#7DFFA0', acc: '#F1FFF2', sub: '#1F4A2A', w: 5 },
    { name: 'Ultramarine', bg: '#2230D0', ink: '#F4EFE4', acc: '#FFB400', sub: '#5560E0', w: 5 },
    { name: 'Bone', bg: '#F4F1EA', ink: '#2E2A26', acc: '#2E2A26', sub: '#B8B1A6', w: 4 },
    { name: 'Ember', bg: '#1A0E0A', ink: '#F2B880', acc: '#FF3D1F', sub: '#5A3020', w: 4 },
  ];

  // elementary rules worth looking at (class 3/4, nested, woven)
  const ECA = [30, 45, 73, 75, 86, 89, 90, 101, 105, 110, 124, 135, 137, 149, 150, 54, 57, 62, 18, 22, 26, 60, 102, 126, 129, 146, 161, 182, 193, 195, 225, 106, 120, 169, 154, 210];
  const ECA_NESTED = [18, 22, 26, 60, 90, 102, 105, 126, 129, 146, 150, 154, 161, 182, 195, 210, 225];
  const LIFE = [
    ['B3/S23', 'Life', [3], [2, 3], 4],
    ['B36/S23', 'HighLife', [3, 6], [2, 3], 3],
    ['B3678/S34678', 'Day & Night', [3, 6, 7, 8], [3, 4, 6, 7, 8], 3],
    ['B368/S245', 'Morley', [3, 6, 8], [2, 4, 5], 3],
    ['B3/S12345', 'Maze', [3], [1, 2, 3, 4, 5], 2],
    ['B35678/S5678', 'Diamoeba', [3, 5, 6, 7, 8], [5, 6, 7, 8], 2],
    ['B3/S1234', 'Mazectric', [3], [1, 2, 3, 4], 2],
    ['B4678/S35678', 'Anneal', [4, 6, 7, 8], [3, 5, 6, 7, 8], 2],
  ];

  // ---------- simulators ----------
  function eca(rule, cols, rows, init, rand) {
    const g = []; let row = new Uint8Array(cols);
    if (init === 'Single') row[cols >> 1] = 1;
    else if (init === 'Sparse') { const k = 3 + Math.floor(rand() * 5); for (let i = 0; i < k; i++) row[Math.floor(rand() * cols)] = 1; }
    else { const d = 0.3 + rand() * 0.4; for (let i = 0; i < cols; i++) row[i] = rand() < d ? 1 : 0; }
    const pat = []; // neighbourhood index that produced each cell
    g.push(row); pat.push(new Uint8Array(cols).fill(255));
    for (let t = 1; t < rows; t++) {
      const n = new Uint8Array(cols), p = new Uint8Array(cols);
      for (let i = 0; i < cols; i++) {
        const k = (row[(i - 1 + cols) % cols] << 2) | (row[i] << 1) | row[(i + 1) % cols];
        n[i] = (rule >> k) & 1; p[i] = k;
      }
      g.push(n); pat.push(p); row = n;
    }
    return { g, pat };
  }
  function tca(code, cols, rows, rand) { // 3-colour totalistic, r = 1
    const digits = []; let c = code; for (let i = 0; i < 7; i++) { digits.push(c % 3); c = Math.floor(c / 3); }
    const g = []; let row = new Uint8Array(cols);
    if (rand() < 0.45) row[cols >> 1] = 1 + Math.floor(rand() * 2);
    else for (let i = 0; i < cols; i++) row[i] = rand() < 0.5 ? Math.floor(rand() * 3) : 0;
    g.push(row);
    for (let t = 1; t < rows; t++) {
      const n = new Uint8Array(cols);
      for (let i = 0; i < cols; i++) n[i] = digits[row[(i - 1 + cols) % cols] + row[i] + row[(i + 1) % cols]];
      g.push(n); row = n;
    }
    return g;
  }
  function life(B, S, N, steps, rand, sym) {
    let a = new Uint8Array(N * N); const age = new Uint16Array(N * N), trail = new Uint8Array(N * N);
    const R = N * (0.16 + rand() * 0.14), d = 0.3 + rand() * 0.3, h = N / 2;
    for (let y = 0; y < Math.ceil(N / 2); y++) for (let x = 0; x < Math.ceil(N / 2); x++) {
      const dx = x - h + 0.5, dy = y - h + 0.5; if (dx * dx + dy * dy > R * R * 2) continue;
      if (Math.abs(dx) > R || Math.abs(dy) > R) continue;
      const v = rand() < d ? 1 : 0;
      const pts = sym === 'Quad' ? [[x, y], [N - 1 - x, y], [x, N - 1 - y], [N - 1 - x, N - 1 - y]] : sym === 'Mirror' ? [[x, y], [N - 1 - x, y], [x, N - 1 - y], [N - 1 - x, N - 1 - y]].slice(0, 2).concat([[x, N - 1 - y], [N - 1 - x, N - 1 - y]]) : [[x, y], [N - 1 - y, x], [N - 1 - x, N - 1 - y], [y, N - 1 - x]];
      pts.forEach(([px, py]) => { a[py * N + px] = v; });
    }
    const bs = new Uint8Array(9), ss = new Uint8Array(9); B.forEach((k) => (bs[k] = 1)); S.forEach((k) => (ss[k] = 1));
    for (let s = 0; s < steps; s++) {
      const b = new Uint8Array(N * N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let n = 0;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { if (!i && !j) continue; const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < N && yy < N) n += a[yy * N + xx]; }
        const k = y * N + x, v = a[k] ? ss[n] : bs[n];
        b[k] = v; age[k] = v ? age[k] + 1 : 0;
        if (a[k] && !v) trail[k] = 1;
      }
      a = b;
    }
    return { a, age, trail };
  }

  // how alive a field is: rejects dead or frozen worlds
  function liveliness(g) {
    const rows = g.length, cols = g[0].length; let on = 0, change = 0;
    for (let t = Math.floor(rows / 2); t < rows; t++) for (let i = 0; i < cols; i++) { on += g[t][i] ? 1 : 0; if (t > 0 && g[t][i] !== g[t - 1][i]) change++; }
    const n = (rows - Math.floor(rows / 2)) * cols;
    return { density: on / n, change: change / n };
  }

  // ---------- drawing helpers ----------
  function runs(row, fn) { let s = -1, v = 0; for (let i = 0; i <= row.length; i++) { const c = i < row.length ? row[i] : -1; if (c !== v) { if (v && s >= 0) fn(s, i - s, v); s = i; v = c; } } }

  function frame(P, id, left, right, extra) {
    const no = 'N\u00BA ' + String(id).padStart(4, '0') + ' / 4444';
    const t = (x, y, s, a, w) => `<text x="${x}" y="${y}" font-family="IBM Plex Mono" font-size="${s}" letter-spacing="${s * 0.18}" fill="${P.ink}" fill-opacity="${a}" text-anchor="${w || 'start'}">`;
    return `<g>${t(80, 66, 17, 0.9)}NOMIO</text>${t(920, 66, 17, 0.9, 'end')}${no}</text>` +
      `<line x1="80" y1="86" x2="920" y2="86" stroke="${P.ink}" stroke-opacity="0.18" stroke-width="1"/>` +
      `<line x1="80" y1="914" x2="920" y2="914" stroke="${P.ink}" stroke-opacity="0.18" stroke-width="1"/>` +
      `${t(80, 946, 15, 0.75)}${left}</text>${t(920, 946, 15, 0.75, 'end')}${right}</text>${extra || ''}</g>`;
  }
  // the classic rule icon: the 8 neighbourhoods and what each becomes
  function ruleIcon(rule, P, cx, y) {
    let s = ''; const u = 6, gap = 10, w = 3 * u, total = 8 * w + 7 * gap; let x = cx - total / 2;
    for (let k = 7; k >= 0; k--) {
      for (let b = 0; b < 3; b++) { const on = (k >> (2 - b)) & 1; s += `<rect x="${f(x + b * u)}" y="${y}" width="${u - 1}" height="${u - 1}" fill="${on ? P.ink : 'none'}" stroke="${P.ink}" stroke-opacity="0.6" stroke-width="0.6"/>`; }
      const o = (rule >> k) & 1; s += `<rect x="${f(x + u)}" y="${y + u}" width="${u - 1}" height="${u - 1}" fill="${o ? P.acc : 'none'}" stroke="${P.ink}" stroke-opacity="0.6" stroke-width="0.6"/>`;
      x += w + gap;
    }
    return s;
  }

  const AX = 120, AY = 130, AW = 760, AH = 740; // art area

  function drawLoom(rand, P, T) {
    const rule = T._rule, init = T.Seed;
    const cols = pickW(rand, [[81, 3], [101, 4], [121, 4], [151, 2]]);
    const cs = AW / cols, rows = Math.floor(AH / cs);
    const { g, pat } = eca(rule, cols, rows, init, rand);
    const accentPats = []; for (let k = 0; k < 8; k++) if ((rule >> k) & 1) accentPats.push(k);
    const accSet = new Set(); const na = accentPats.length > 3 ? 2 : 1; for (let i = 0; i < na; i++) accSet.add(pick(rand, accentPats));
    const tex = T.Texture; let s = '';
    const gp = tex === 'Block' ? cs * 0.08 : 0;
    for (let t = 0; t < rows; t++) {
      const y = AY + t * cs, rowc = new Uint8Array(cols);
      for (let i = 0; i < cols; i++) rowc[i] = g[t][i] ? (accSet.has(pat[t][i]) ? 2 : 1) : 0;
      if (tex === 'Dot') {
        for (let i = 0; i < cols; i++) if (rowc[i]) s += `<circle cx="${f(AX + i * cs + cs / 2)}" cy="${f(y + cs / 2)}" r="${f(cs * (rowc[i] === 2 ? 0.46 : 0.36))}" fill="${rowc[i] === 2 ? P.acc : P.ink}"/>`;
      } else if (tex === 'Stitch') {
        runs(rowc, (a, n, v) => { s += `<rect x="${f(AX + a * cs + cs * 0.12)}" y="${f(y + cs * 0.3)}" width="${f(n * cs - cs * 0.24)}" height="${f(cs * 0.4)}" rx="${f(cs * 0.2)}" fill="${v === 2 ? P.acc : P.ink}"/>`; });
      } else {
        runs(rowc, (a, n, v) => { s += `<rect x="${f(AX + a * cs + gp / 2)}" y="${f(y + gp / 2)}" width="${f(n * cs - gp)}" height="${f(cs - gp)}" fill="${v === 2 ? P.acc : P.ink}"/>`; });
      }
    }
    return { svg: s, stats: liveliness(g) };
  }

  function drawHalo(rand, P, T) {
    const rule = T._rule, init = T.Seed;
    const N = pickW(rand, [[96, 3], [128, 4], [180, 3]]), G = pickW(rand, [[40, 2], [56, 3], [72, 2]]);
    const { g, pat } = eca(rule, N, G, init, rand);
    const cx = 500, cy = 500, r0 = 60, r1 = 360, dr = (r1 - r0) / G;
    const accentPats = []; for (let k = 0; k < 8; k++) if ((rule >> k) & 1) accentPats.push(k);
    const acc = pick(rand, accentPats);
    let s = `<circle cx="${cx}" cy="${cy}" r="${r1 + 14}" fill="none" stroke="${P.ink}" stroke-opacity="0.15"/>`;
    const arc = (ra, rb, a0, a1, col) => {
      const p = (r, a) => `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`; const lg = a1 - a0 > Math.PI ? 1 : 0;
      return `<path d="M${p(rb, a0)}A${f(rb)} ${f(rb)} 0 ${lg} 1 ${p(rb, a1)}L${p(ra, a1)}A${f(ra)} ${f(ra)} 0 ${lg} 0 ${p(ra, a0)}Z" fill="${col}"/>`;
    };
    const da = (Math.PI * 2) / N, inward = rand() < 0.5;
    for (let t = 0; t < G; t++) {
      const gi = inward ? G - 1 - t : t;
      const ra = r0 + t * dr + dr * 0.1, rb = r0 + (t + 1) * dr - dr * 0.1;
      const rowc = new Uint8Array(N); for (let i = 0; i < N; i++) rowc[i] = g[gi][i] ? (pat[gi][i] === acc ? 2 : 1) : 0;
      runs(rowc, (a, n, v) => { s += arc(ra, rb, -Math.PI / 2 + a * da + da * 0.06, -Math.PI / 2 + (a + n) * da - da * 0.06, v === 2 ? P.acc : P.ink); });
    }
    s += `<circle cx="${cx}" cy="${cy}" r="${r0 * 0.45}" fill="${P.acc}"/>`;
    return { svg: s, stats: liveliness(g) };
  }

  function drawStrata(rand, P, T) {
    const cols = pickW(rand, [[91, 3], [121, 3], [151, 2]]), cs = AW / cols, rows = Math.floor(AH / cs);
    let g, code, st, tries = 0;
    do { code = Math.floor(rand() * 2187); g = tca(code, cols, rows, rand); st = liveliness(g); tries++; }
    while ((st.density < 0.12 || st.density > 0.85 || st.change < 0.08 || st.change > 0.62) && tries < 80);
    T.Rule = 'Code ' + code; T._code = code;
    const c2 = P.sub; let s = '';
    for (let t = 0; t < rows; t++) {
      const y = AY + t * cs;
      runs(g[t], (a, n, v) => { s += `<rect x="${f(AX + a * cs + cs * 0.06)}" y="${f(y + cs * 0.06)}" width="${f(n * cs - cs * 0.12)}" height="${f(cs * 0.88)}" rx="${f(cs * 0.44)}" fill="${v === 2 ? P.acc : P.ink}"${v === 1 && T.Texture === 'Tonal' ? ' fill-opacity="0.42"' : ''}/>`; });
    }
    return { svg: s, stats: st };
  }

  function drawBloom(rand, P, T) {
    const L = pickW(rand, LIFE.map((x) => [x, x[4]]));
    const N = pickW(rand, [[64, 3], [80, 3], [96, 2]]);
    const sym = pickW(rand, [['Quad', 5], ['Rotor', 3]]);
    let res, tries = 0, steps, alive;
    do { steps = 20 + Math.floor(rand() * 90); res = life(L[2], L[3], N, steps, rand, sym); alive = res.a.reduce((x, y) => x + y, 0); tries++; } while ((alive < N * N * 0.03 || alive > N * N * 0.7) && tries < 12);
    T.Rule = L[1] + ' ' + L[0]; T._life = L[0]; T.Seed = sym === 'Quad' ? 'Quad Soup' : 'Rotor Soup'; T.Generation = steps;
    let x0 = N, y0 = N, x1 = 0, y1 = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (res.a[y * N + x] || res.trail[y * N + x]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    if (x1 < x0) { x0 = 0; y0 = 0; x1 = N - 1; y1 = N - 1; }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, cs = Math.min(AW / bw, AH / bh, (AW / N) * 4);
    const ox = 500 - (bw * cs) / 2 - x0 * cs, oy = 500 - (bh * cs) / 2 - y0 * cs; let s = '';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const k = y * N + x, cx = f(ox + x * cs + cs / 2), cy = f(oy + y * cs + cs / 2);
      if (res.a[k]) {
        const old = res.age[k] > 6;
        s += T.Texture === 'Tile' ? `<rect x="${f(ox + x * cs + cs * 0.08)}" y="${f(oy + y * cs + cs * 0.08)}" width="${f(cs * 0.84)}" height="${f(cs * 0.84)}" fill="${old ? P.acc : P.ink}"/>` : `<circle cx="${cx}" cy="${cy}" r="${f(cs * 0.44)}" fill="${old ? P.acc : P.ink}"/>`;
      } else if (res.trail[k]) s += `<circle cx="${cx}" cy="${cy}" r="${f(cs * 0.14)}" fill="${P.ink}" fill-opacity="0.35"/>`;
    }
    return { svg: s, stats: { density: alive / (N * N), change: 0.5 } };
  }

  function render(seedHex, id) {
    const rand = rngFrom(seedHex);
    const P = pickW(rand, PALETTES.map((p) => [p, p.w]));
    const form = pickW(rand, [['Loom', 40], ['Halo', 22], ['Strata', 20], ['Bloom', 18]]);
    const T = { Form: form, Palette: P.name };
    let body, left, right, extra = '';
    if (form === 'Loom' || form === 'Halo') {
      let tries = 0, out, rule, init;
      const r2 = rngFrom(seedHex + 'ff');
      do {
        init = pickW(rand, [['Single', 3], ['Sparse', 2], ['Soup', 5]]);
        rule = init === 'Single' ? pick(rand, form === 'Halo' ? ECA_NESTED.filter((r) => r !== 60 && r !== 102) : ECA_NESTED) : pick(rand, ECA);
        T._rule = rule; T.Rule = 'Rule ' + rule; T.Seed = init;
        T.Texture = form === 'Loom' ? pickW(rand, [['Block', 5], ['Stitch', 3], ['Dot', 3]]) : 'Arc';
        const st = liveliness(eca(rule, 101, 80, init, rngFrom(seedHex + tries)).g);
        out = st; tries++;
        if (st.density > 0.06 && st.density < 0.86 && st.change > 0.04 && st.change < 0.7) break;
      } while (tries < 40);
      const R = rngFrom(seedHex + 'draw');
      body = (form === 'Loom' ? drawLoom : drawHalo)(R, P, T);
      left = `${T.Rule.toUpperCase()} \u00B7 ${form.toUpperCase()}`;
      extra = ruleIcon(rule, P, 500, 932);
    } else if (form === 'Strata') {
      T.Seed = 'Three-State'; T.Texture = pickW(rand, [['Solid', 6], ['Tonal', 4]]);
      body = drawStrata(rand, P, T);
      left = `${T.Rule.toUpperCase()} \u00B7 STRATA`;
    } else {
      T.Texture = pickW(rand, [['Cell', 6], ['Tile', 4]]);
      body = drawBloom(rand, P, T);
      left = `${T._life} \u00B7 BLOOM`;
    }
    const d = body.stats.density;
    T.Density = d < 0.25 ? 'Sparse' : d < 0.45 ? 'Balanced' : d < 0.65 ? 'Dense' : 'Saturated';
    right = 'DENSITY ' + d.toFixed(2);
    const dark = ['Noir', 'Cobalt', 'Phosphor', 'Ultramarine', 'Ember'].includes(P.name);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">` +
      `<defs><filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${parseInt(String(seedHex).slice(-6), 16) % 999}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 ${dark ? 1 : 0}  0 0 0 0 ${dark ? 1 : 0}  0 0 0 0 ${dark ? 1 : 0}  0 0 0 ${dark ? 0.06 : 0.09} 0"/></filter></defs>` +
      `<rect width="1000" height="1000" fill="${P.bg}"/>` + body.svg + frame(P, id, left, right, extra) +
      `<rect width="1000" height="1000" filter="url(#grain)"/></svg>`;
    const traits = { Form: T.Form, Rule: T.Rule, Palette: T.Palette, Seed: T.Seed, Texture: T.Texture, Density: T.Density };
    return { svg, traits };
  }

  const api = { render, PALETTES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Nomio = api;
})(typeof window !== 'undefined' ? window : globalThis);
