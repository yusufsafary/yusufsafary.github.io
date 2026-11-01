// Holder claim panel: reads the claim contract directly from the browser
// (window.NomioChain) and fills the claim ledger; also powers the
// check-a-work form.
(function () {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n).toLocaleString('en-US');
  if (!$('claim')) return;

  async function loadClaim() {
    try {
      const j = await window.NomioChain.claim();
      if (j.error) return;
      $('cClaimed').textContent = fmt(j.claimed);
      $('cFill').style.width = (j.claimed / j.max * 100) + '%';
      $('cStatus').textContent = j.open ? 'Claims open' : 'Opening soon';
    } catch (e) {}
  }
  loadClaim(); setInterval(loadClaim, 15000);

  $('workBtn').addEventListener('click', async () => {
    const out = $('workOut');
    const v = $('work').value.trim();
    if (!/^\d+$/.test(v) || Number(v) < 1 || Number(v) > 4444) { out.textContent = 'Enter a Nomio number between 1 and 4,444.'; return; }
    const id = Number(v);
    out.textContent = 'Checking…';
    try {
      const j = await window.NomioChain.claim(id);
      if (j.error) { out.textContent = 'Could not reach the contract. Try again.'; return; }
      if (!j.owner) out.textContent = 'Nomio #' + id + ' has not been minted yet.';
      else if (j.claimedForId) out.textContent = 'Nomio #' + id + ' has already claimed its $NOMIO.';
      else out.textContent = 'Nomio #' + id + ' can still claim 250,000 $NOMIO. Held by ' + j.owner.slice(0, 6) + '…' + j.owner.slice(-4) + '.';
    } catch (e) { out.textContent = 'Could not reach the contract. Try again.'; }
  });
})();
