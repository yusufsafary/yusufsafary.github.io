// Browser chain reads for the static build of nomio.uk (GitHub Pages).
// Replaces the former Vercel /api endpoints (stats, recent, claim, market)
// with direct BSC RPC calls from the visitor's browser. Read-only.
(function () {
  'use strict';
  var NFT = '0x48b5e5573e76caaa41a893496de6c857720e6b40';
  var CLAIM = '0xcbeE2612E3f3FEb298b274E7119a6a9ce08871b9';
  var TOKEN = '0x84B61D73E098e7D46B214bF0032E5C5CdfbAc433';
  var ZERO = '0x0000000000000000000000000000000000000000';
  var RPCS = [
    'https://bsc-rpc.publicnode.com',
    'https://bsc-dataseed.bnbchain.org',
    'https://bsc-dataseed1.binance.org',
    'https://bsc-mainnet.public.blastapi.io'
  ];
  var SEL = {
    totalSupply: '0x18160ddd',
    seedOf: '0x82829f74',
    ownerOf: '0x6352211e',
    stats: '0x8bcdcbf3',
    totalClaimed: '0xd54ad2a1',
    claimsRemaining: '0x754c463f',
    claimOpen: '0x4b8bcb58',
    claimedById: '0x4c80ee12'
  };

  function encUint(n) { return BigInt(n).toString(16).padStart(64, '0'); }
  function encAddr(a) { return String(a).toLowerCase().replace(/^0x/, '').padStart(64, '0'); }
  function wordAt(hex, i) { return BigInt('0x' + hex.slice(2 + i * 64, 2 + (i + 1) * 64)); }
  function addrAt(hex, i) { return '0x' + hex.slice(2 + i * 64 + 24, 2 + (i + 1) * 64); }

  function post(url, payload) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 20000) : null;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }, function (e) {
      if (timer) clearTimeout(timer);
      throw e;
    });
  }
  // Try each RPC endpoint in turn until one answers.
  function viaRpc(fn) {
    var p = Promise.reject(new Error('no rpc'));
    RPCS.forEach(function (u) { p = p.catch(function () { return fn(u); }); });
    return p;
  }
  function ethCall(to, data) {
    return viaRpc(function (u) {
      return post(u, { jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: to, data: data }, 'latest'] })
        .then(function (j) {
          if (j.error || typeof j.result !== 'string') throw new Error('rpc error');
          return j.result;
        });
    });
  }
  // Multicall3 aggregate3: many contract reads inside ONE eth_call.
  // (JSON-RPC batch requests are rate-limited by several public RPCs;
  // a single aggregate3 call is not.) calls: [{to, data}] ->
  // [{ok, result}] where result is the raw return-data hex.
  var MC3 = '0xcA11bde05977b3631167028862bE2a173976CA11';
  var AGG_SEL = '0x82ad56cb';
  function encBytes(hex) {
    var body = hex.replace(/^0x/, '');
    var padded = body.padEnd(Math.ceil(body.length / 64) * 64, '0');
    return encUint(body.length / 2) + padded;
  }
  function aggregate3(calls) {
    var tuples = calls.map(function (c) {
      return encAddr(c.to) + encUint(1) + encUint(96) + encBytes(c.data);
    });
    var head = '', tail = '', off = tuples.length * 32;
    tuples.forEach(function (t) {
      head += encUint(off);
      tail += t;
      off += t.length / 2;
    });
    var data = AGG_SEL + encUint(32) + encUint(calls.length) + head + tail;
    return ethCall(MC3, data).then(function (hex) {
      var base = 2 + Number(wordAt(hex, 0)) * 2; // start of array data
      var len = Number(wordAt(hex, (base - 2) / 64));
      var out = [];
      for (var i = 0; i < len; i++) {
        var rel = Number(wordAt(hex, (base - 2) / 64 + 1 + i));
        var t = (base - 2) / 64 + 1 + rel / 32;
        var ok = wordAt(hex, t) !== 0n;
        var bOff = Number(wordAt(hex, t + 1));
        var bLen = Number(wordAt(hex, t + bOff / 32));
        var bytes = '0x' + hex.slice((t + bOff / 32 + 1) * 64 + 2, (t + bOff / 32 + 1) * 64 + 2 + bLen * 2);
        out.push({ ok: ok, result: bytes });
      }
      return out;
    });
  }
  // Run aggregate3 over chunks of `size` calls, up to 4 chunks in parallel.
  function aggregate3Chunked(calls, size) {
    var chunks = [];
    for (var i = 0; i < calls.length; i += size) chunks.push(calls.slice(i, i + size));
    var out = new Array(chunks.length);
    var next = 0;
    function worker() {
      var idx = next++;
      if (idx >= chunks.length) return Promise.resolve();
      return aggregate3(chunks[idx]).then(function (r) {
        out[idx] = r;
        return worker();
      });
    }
    var pool = [];
    for (var w = 0; w < Math.min(4, chunks.length); w++) pool.push(worker());
    return Promise.all(pool).then(function () {
      var flat = [];
      out.forEach(function (r) { flat = flat.concat(r); });
      return flat;
    });
  }

  // ---- /api/stats equivalent ----
  function stats(wallet) {
    var w = /^0x[0-9a-fA-F]{40}$/.test(wallet || '') ? wallet : ZERO;
    return ethCall(NFT, SEL.stats + encAddr(w)).then(function (hex) {
      return {
        minted: Number(wordAt(hex, 0)),
        max: Number(wordAt(hex, 1)),
        priceWei: wordAt(hex, 2).toString(),
        open: wordAt(hex, 3) !== 0n,
        hasAgentId: wordAt(hex, 4) !== 0n,
        hasMinted: wordAt(hex, 5) !== 0n,
        contract: NFT
      };
    });
  }

  // ---- /api/recent equivalent ----
  function recent() {
    return ethCall(NFT, SEL.totalSupply).then(function (hex) {
      var n = Number(wordAt(hex, 0));
      var ids = [];
      for (var i = n; i > Math.max(0, n - 12); i--) ids.push(i);
      var calls = ids.map(function (id) { return { to: NFT, data: SEL.seedOf + encUint(id) }; });
      return aggregate3(calls).then(function (results) {
        var items = [];
        ids.forEach(function (id, k) {
          var r = results[k];
          if (!r || !r.ok) return;
          var v = wordAt(r.result, 0);
          if (v === 0n) return;
          items.push({ id: id, seed: '0x' + v.toString(16).padStart(64, '0') });
        });
        return { minted: n, items: items };
      });
    });
  }

  // ---- /api/claim equivalent ----
  function claim(id) {
    var calls = [
      { to: CLAIM, data: SEL.totalClaimed },
      { to: CLAIM, data: SEL.claimsRemaining },
      { to: CLAIM, data: SEL.claimOpen }
    ];
    if (id !== undefined) {
      calls.push({ to: CLAIM, data: SEL.claimedById + encUint(id) });
      calls.push({ to: NFT, data: SEL.ownerOf + encUint(id) });
    }
    return aggregate3(calls).then(function (r) {
      if (!r[0].ok || !r[1].ok || !r[2].ok) throw new Error('claim read failed');
      var out = {
        claimed: Number(wordAt(r[0].result, 0)),
        max: 4444,
        remaining: Number(wordAt(r[1].result, 0)),
        open: wordAt(r[2].result, 0) !== 0n,
        claimContract: CLAIM,
        tokenContract: TOKEN
      };
      if (id !== undefined) {
        out.id = id;
        out.claimedForId = r[3].ok ? wordAt(r[3].result, 0) !== 0n : false;
        out.owner = r[4].ok ? addrAt(r[4].result, 0) : null;
      }
      return out;
    });
  }

  // ---- /api/market equivalent ----
  // Traits never change (seed is fixed at mint), so they ship as a static
  // snapshot in /market-data.json; owners and new mints are read live.
  function market() {
    var snapP = fetch('/market-data.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
    return Promise.all([snapP, ethCall(NFT, SEL.totalSupply)]).then(function (pair) {
      var snap = pair[0] || { minted: 0, items: [] };
      var n = Number(wordAt(pair[1], 0));
      var byId = {};
      (snap.items || []).forEach(function (it) { byId[it.id] = it; });
      var calls = [];
      var i;
      for (i = 1; i <= n; i++) calls.push({ to: NFT, data: SEL.ownerOf + encUint(i) });
      return aggregate3Chunked(calls, 300).then(function (owners) {
        var fresh = [];
        for (i = (snap.minted || 0) + 1; i <= n; i++) if (!byId[i]) fresh.push(i);
        var seedCalls = fresh.map(function (id) { return { to: NFT, data: SEL.seedOf + encUint(id) }; });
        return (seedCalls.length ? aggregate3(seedCalls) : Promise.resolve([])).then(function (seeds) {
          fresh.forEach(function (id, k) {
            var r = seeds[k];
            if (!r || !r.ok) return;
            var v = wordAt(r.result, 0);
            if (v === 0n || !window.Nomio) return;
            var seed = '0x' + v.toString(16).padStart(64, '0');
            try {
              var t = window.Nomio.render(seed, id).traits;
              byId[id] = { id: id, owner: null, form: t.Form, palette: t.Palette, rule: t.Rule };
            } catch (e) {}
          });
          var items = [];
          var ownerSet = {};
          for (i = 1; i <= n; i++) {
            var base = byId[i];
            if (!base) continue;
            var owner = owners[i - 1] && owners[i - 1].ok ? addrAt(owners[i - 1].result, 0) : base.owner;
            if (!owner) continue;
            ownerSet[owner.toLowerCase()] = 1;
            items.push({
              id: i,
              owner: owner,
              form: base.form,
              palette: base.palette,
              rule: base.rule,
              element: 'https://element.market/assets/bsc/' + NFT + '/' + i
            });
          }
          return { contract: NFT, chain: 'bsc', minted: n, owners: Object.keys(ownerSet).length, items: items };
        });
      });
    });
  }

  window.NomioChain = { stats: stats, recent: recent, claim: claim, market: market };
})();
