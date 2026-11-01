// The Nomio market opens 2 November 2026 at 00.00 UTC. Until that instant
// the site announces the opening with a live countdown; from that instant
// every market marker on the site flips to open on its own.
const MARKET_OPEN_AT = Date.UTC(2026, 10, 2, 0, 0, 0);
const ELEMENT_COLLECTION = 'https://element.market/collections/nomio';

function marketIsOpen() { return Date.now() >= MARKET_OPEN_AT; }

function fmtCountdown(ms) {
  let s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const p = (n) => String(n).padStart(2, '0');
  return (d > 0 ? d + 'd ' : '') + p(h) + 'h ' + p(m) + 'm ' + p(s) + 's';
}

let marketWasOpen = null;
function applyMarketState() {
  const open = marketIsOpen();
  document.querySelectorAll('[data-open-hide]').forEach((el) => { el.style.display = open ? 'none' : ''; });
  document.querySelectorAll('[data-open-show]').forEach((el) => { el.style.display = open ? '' : 'none'; });
  document.querySelectorAll('[data-cd]').forEach((el) => { el.textContent = fmtCountdown(MARKET_OPEN_AT - Date.now()); });
  if (marketWasOpen !== null && open !== marketWasOpen && typeof window.onMarketFlip === 'function') window.onMarketFlip();
  marketWasOpen = open;
}
document.addEventListener('DOMContentLoaded', () => { applyMarketState(); setInterval(applyMarketState, 1000); });
