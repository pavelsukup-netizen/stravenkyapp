const STORAGE_KEY = 'stravenky-v1';

const state = loadState();

const el = {
  balance: document.getElementById('balance'),
  topupTotal: document.getElementById('topupTotal'),
  paymentTotal: document.getElementById('paymentTotal'),
  topupAmount: document.getElementById('topupAmount'),
  paymentName: document.getElementById('paymentName'),
  paymentAmount: document.getElementById('paymentAmount'),
  history: document.getElementById('history'),
  addTopupBtn: document.getElementById('addTopupBtn'),
  addPaymentBtn: document.getElementById('addPaymentBtn'),
  resetBtn: document.getElementById('resetBtn'),
  tabs: Array.from(document.querySelectorAll('.tab')),
  panels: {
    topup: document.getElementById('panel-topup'),
    payment: document.getElementById('panel-payment'),
  }
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.items)) return { items: [] };
    return parsed;
  } catch {
    return { items: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0
  }).format(value);
}

function getTotals() {
  return state.items.reduce((acc, item) => {
    if (item.type === 'topup') acc.topups += item.amount;
    if (item.type === 'payment') acc.payments += item.amount;
    return acc;
  }, { topups: 0, payments: 0 });
}

function getBalance() {
  const totals = getTotals();
  return totals.topups - totals.payments;
}

function createItem(type, name, amount) {
  return {
    id: crypto.randomUUID(),
    type,
    name,
    amount,
    createdAt: new Date().toISOString()
  };
}

function renderHistory() {
  if (!state.items.length) {
    el.history.className = 'list empty-state';
    el.history.textContent = 'Zatím tu nic není.';
    return;
  }

  el.history.className = 'list';
  el.history.innerHTML = state.items.map((item) => {
    const date = new Date(item.createdAt).toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="item">
        <div>
          <div class="item-title">${escapeHtml(item.name)}</div>
          <div class="item-meta">${date}</div>
        </div>
        <div class="amount ${item.type}">${item.type === 'topup' ? '+' : '-'}${formatCurrency(item.amount)}</div>
      </div>
    `;
  }).join('');
}

function renderSummary() {
  const totals = getTotals();
  el.balance.textContent = formatCurrency(getBalance());
  el.topupTotal.textContent = formatCurrency(totals.topups);
  el.paymentTotal.textContent = formatCurrency(totals.payments);
}

function render() {
  renderSummary();
  renderHistory();
}

function parseAmount(value) {
  const normalized = String(value).replace(',', '.').trim();
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

function addTopup() {
  const amount = parseAmount(el.topupAmount.value);
  if (!amount) {
    alert('Zadej platnou částku nabití.');
    return;
  }

  state.items.unshift(createItem('topup', 'Nabití', amount));
  el.topupAmount.value = '';
  saveState();
  render();
}

function addPayment() {
  const amount = parseAmount(el.paymentAmount.value);
  const name = el.paymentName.value.trim() || 'Platba';

  if (!amount) {
    alert('Zadej platnou částku platby.');
    return;
  }

  state.items.unshift(createItem('payment', name, amount));
  el.paymentName.value = '';
  el.paymentAmount.value = '';
  saveState();
  render();
}

function resetAll() {
  const ok = confirm('Fakt chceš smazat celý přehled stravenek?');
  if (!ok) return;
  state.items = [];
  saveState();
  render();
}

function setTab(tabName) {
  el.tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === tabName));
  Object.entries(el.panels).forEach(([key, panel]) => {
    panel.classList.toggle('active', key === tabName);
  });
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

el.addTopupBtn.addEventListener('click', addTopup);
el.addPaymentBtn.addEventListener('click', addPayment);
el.resetBtn.addEventListener('click', resetAll);

el.tabs.forEach((tab) => {
  tab.addEventListener('click', () => setTab(tab.dataset.tab));
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

render();
