// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCqAF7tFh-AsYgKHfKCybga3DjrawCkt7k",
  authDomain: "kiosk-database-3b387.firebaseapp.com",
  databaseURL: "https://kiosk-database-3b387-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kiosk-database-3b387",
  storageBucket: "kiosk-database-3b387.firebasestorage.app",
  messagingSenderId: "80176737991",
  appId: "1:80176737991:web:009ae92e43e394ace158e2"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const inventoriesRef = db.ref('inventories');

// State
let inventories = [];
let tempItems = [];
let currentInventoryName = '';
let currentViewingId = null;
let isEditMode = false;
let displayedLimit = 10;

// DOM Elements
const menuBtn = document.getElementById('menu-btn');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const sidebarDrawer = document.getElementById('sidebar-drawer');
const drawerOverlay = document.getElementById('drawer-overlay');
const menuInventoryLink = document.getElementById('menu-inventory-link');

const openCreateBtn = document.getElementById('open-create-btn');
const nameModal = document.getElementById('name-modal');
const closeNameModal = document.getElementById('close-name-modal');
const inventoryNameInput = document.getElementById('inventory-name-input');
const nameNextBtn = document.getElementById('name-next-btn');

const createModal = document.getElementById('create-modal');
const closeCreateModal = document.getElementById('close-create-modal');
const createModalTitle = document.getElementById('create-modal-title');
const createModalSubtitle = document.getElementById('create-modal-subtitle');

const addItemForm = document.getElementById('add-item-form');
const productNameInput = document.getElementById('product-name');
const productQtyInput = document.getElementById('product-qty');
const productEkInput = document.getElementById('product-ek');
const productVkInput = document.getElementById('product-vk');
const tempItemsTbody = document.getElementById('temp-items-tbody');
const emptyTableMsg = document.getElementById('empty-table-msg');
const finishInventoryBtn = document.getElementById('finish-inventory-btn');

const inventoryFrame = document.getElementById('inventory-frame');
const inventoryList = document.getElementById('inventory-list');
const inventoryCount = document.getElementById('inventory-count');
const scrollSentinel = document.getElementById('scroll-sentinel');

const detailModal = document.getElementById('detail-modal');
const closeDetailModal = document.getElementById('close-detail-modal');
const detailTitle = document.getElementById('detail-title');
const detailCreated = document.getElementById('detail-created');
const detailUpdated = document.getElementById('detail-updated');
const detailItemsTbody = document.getElementById('detail-items-tbody');
const toggleEditBtn = document.getElementById('toggle-edit-btn');
const saveEditBtn = document.getElementById('save-edit-btn');
const editControls = document.getElementById('edit-controls');
const editProductName = document.getElementById('edit-product-name');
const editProductQty = document.getElementById('edit-product-qty');
const editProductEk = document.getElementById('edit-product-ek');
const editProductVk = document.getElementById('edit-product-vk');
const editAddItemBtn = document.getElementById('edit-add-item-btn');

// Delete elements
const deleteInventoryBtn = document.getElementById('delete-inventory-btn');
const confirmDeleteModal = document.getElementById('confirm-delete-modal');
const closeConfirmDeleteModal = document.getElementById('close-confirm-delete-modal');
const cancelConfirmDeleteBtn = document.getElementById('cancel-confirm-delete-btn');
const confirmDeleteInput = document.getElementById('confirm-delete-input');
const executeDeleteBtn = document.getElementById('execute-delete-btn');

let currentEditingItems = [];

// Modal state helpers to freeze background scroll
function openModal(modalEl) {
  modalEl.classList.add('open');
  document.body.classList.add('modal-open');
}

function closeModal(modalEl) {
  modalEl.classList.remove('open');
  // Only remove modal-open from body if no other modal is open
  const anyOpen = document.querySelector('.modal.open');
  if (!anyOpen) {
    document.body.classList.remove('modal-open');
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  setupDrawer();
  setupCreateModal();
  setupDetailModal();
  setupInfiniteScroll();
  setupLock();
  // Erst beim Server nachfragen, ob man eingeloggt ist – dann Daten laden
  checkAuth().then((ok) => {
    if (ok) unlockApp();
    else showLock();
  });
});

// ---------- Passwort-Sperre (Server prüft das Passwort) ----------
let appStarted = false;

async function checkAuth() {
  try {
    const res = await fetch('/api/check', { cache: 'no-store', credentials: 'same-origin' });
    return res.ok;
  } catch (err) {
    console.error('Server nicht erreichbar:', err);
    return false;
  }
}

// Vor jeder Aktion: Server fragen, ob das Passwort eingegeben wurde
async function requireAuth() {
  const ok = await checkAuth();
  if (!ok) showLock('Bitte Passwort erneut eingeben');
  return ok;
}

function showLock(message) {
  document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
  document.body.classList.remove('modal-open');
  document.getElementById('lock-text').textContent = message || 'Bitte Passwort eingeben';
  document.getElementById('lock-error').textContent = '';
  document.getElementById('lock-screen').classList.remove('hidden');
  const input = document.getElementById('lock-input');
  input.value = '';
  setTimeout(() => input.focus(), 100);
}

function unlockApp() {
  document.getElementById('lock-screen').classList.add('hidden');
  if (!appStarted) {
    appStarted = true;
    listenToFirebase();
  }
}

function setupLock() {
  const form = document.getElementById('lock-form');
  const input = document.getElementById('lock-input');
  const btn = document.getElementById('lock-btn');
  const error = document.getElementById('lock-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!input.value) { input.focus(); return; }
    btn.disabled = true;
    btn.textContent = 'Prüfe...';
    error.textContent = '';
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password: input.value })
      });
      if (res.ok) {
        input.value = '';
        input.blur();
        unlockApp();
      } else {
        error.textContent = res.status === 401 ? 'Falsches Passwort' : 'Fehler beim Server';
        form.classList.remove('shake');
        void form.offsetWidth;
        form.classList.add('shake');
        input.select();
      }
    } catch (err) {
      error.textContent = 'Server nicht erreichbar';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entsperren';
    }
  });

  document.getElementById('menu-logout-link').addEventListener('click', async (e) => {
    e.preventDefault();
    try { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }); } catch (err) {}
    location.reload();
  });
}

// Drawer Controls
function setupDrawer() {
  function openDrawer() {
    sidebarDrawer.classList.add('open');
    drawerOverlay.classList.add('open');
  }
  function closeDrawer() {
    sidebarDrawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
  }
  menuBtn.addEventListener('click', openDrawer);
  closeDrawerBtn.addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);
  menuInventoryLink.addEventListener('click', (e) => {
    e.preventDefault();
    showView('inventory');
    closeDrawer();
  });
  document.getElementById('menu-home-link').addEventListener('click', (e) => {
    e.preventDefault();
    showView('home');
    closeDrawer();
  });
}

// Zwischen Home und Inventar wechseln
function showView(name) {
  document.getElementById('view-home').classList.toggle('hidden', name !== 'home');
  document.getElementById('view-inventory').classList.toggle('hidden', name !== 'inventory');
  document.getElementById('menu-home-link').classList.toggle('active', name === 'home');
  menuInventoryLink.classList.toggle('active', name === 'inventory');
}

// ---------- Home: Kuchendiagramm der letzten Inventur ----------
// Farben in fester Reihenfolge (für dunklen Hintergrund), Rest = "Sonstige" in Grau
const PIE_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9', '#e66767'];
const PIE_OTHER_COLOR = '#5d6877';
let lastSavedHomeJson = '';

// Produkte der letzten Inventur zusammenfassen (gleiche Namen addieren), nach Menge sortiert
function getProductShares(inv) {
  const map = new Map();
  (inv && inv.items ? inv.items : []).forEach((it) => {
    const name = String(it.name || '').trim() || 'Ohne Name';
    const key = name.toLowerCase();
    const q = Number(it.quantity) || 0;
    if (!map.has(key)) map.set(key, { name, quantity: 0 });
    map.get(key).quantity += q;
  });
  const list = [...map.values()].filter(p => p.quantity > 0).sort((a, b) => b.quantity - a.quantity);
  const total = list.reduce((s, p) => s + p.quantity, 0);
  return {
    total,
    products: list.map(p => ({ ...p, percent: total ? Math.round(p.quantity / total * 1000) / 10 : 0 }))
  };
}

function formatPercent(p) {
  return p.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
}

function polarPoint(cx, cy, r, angle) {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function renderHome() {
  const svg = document.getElementById('pie-chart');
  const legend = document.getElementById('pie-legend');
  const subtitle = document.getElementById('home-subtitle');
  const tooltip = document.getElementById('pie-tooltip');
  if (!svg) return;

  const latest = inventories[0];
  const { total, products } = getProductShares(latest);

  if (!latest || total === 0) {
    subtitle.textContent = 'Noch keine Inventur vorhanden';
    svg.innerHTML = '<circle cx="100" cy="100" r="90" fill="none" stroke="#252e3a" stroke-width="2" stroke-dasharray="4 4"/>';
    legend.innerHTML = '<li class="legend-empty">Keine Produkte</li>';
    saveHomeToFirebase(latest, total, products);
    return;
  }

  subtitle.textContent = `${latest.name || 'Letzte Inventur'} · ${formatDate(latest.createdAt)} · ${total} Stk.`;

  // Bis zu 7 Produkte bekommen eine eigene Farbe, der Rest wird im Diagramm zu "Sonstige"
  const maxSlices = PIE_COLORS.length;
  const top = products.length > maxSlices + 1 ? products.slice(0, maxSlices) : products;
  const rest = products.length > maxSlices + 1 ? products.slice(maxSlices) : [];
  const slices = top.map((p, i) => ({ ...p, color: PIE_COLORS[i] }));
  if (rest.length) {
    const q = rest.reduce((s, p) => s + p.quantity, 0);
    slices.push({ name: `Sonstige (${rest.length})`, quantity: q, percent: Math.round(q / total * 1000) / 10, color: PIE_OTHER_COLOR });
  }

  const cx = 100, cy = 100, r = 92;
  let angle = -Math.PI / 2;
  svg.innerHTML = '';
  slices.forEach((s, i) => {
    const sweep = (s.quantity / total) * Math.PI * 2;
    let el;
    if (slices.length === 1) {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      el.setAttribute('cx', cx); el.setAttribute('cy', cy); el.setAttribute('r', r);
    } else {
      const [x1, y1] = polarPoint(cx, cy, r, angle);
      const [x2, y2] = polarPoint(cx, cy, r, angle + sweep);
      const large = sweep > Math.PI ? 1 : 0;
      el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('d', `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`);
    }
    el.setAttribute('fill', s.color);
    el.setAttribute('class', 'pie-slice');
    el.dataset.index = i;
    el.addEventListener('pointerenter', () => highlightSlice(i));
    el.addEventListener('pointermove', (e) => showPieTooltip(e, s));
    el.addEventListener('pointerleave', () => { highlightSlice(-1); tooltip.classList.remove('show'); });
    el.addEventListener('click', (e) => { highlightSlice(i); showPieTooltip(e, s); });
    svg.appendChild(el);

    // Prozent direkt im Stück anzeigen, wenn es groß genug ist
    if (s.percent >= 7) {
      const [lx, ly] = polarPoint(cx, cy, r * 0.62, angle + sweep / 2);
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', slices.length === 1 ? cx : lx);
      t.setAttribute('y', slices.length === 1 ? cy : ly);
      t.setAttribute('class', 'pie-label');
      t.textContent = Math.round(s.percent) + '%';
      svg.appendChild(t);
    }
    angle += sweep;
  });

  // Legende: alle Produkte der letzten Inventur mit Prozent
  legend.innerHTML = '';
  products.forEach((p, i) => {
    const color = i < top.length ? PIE_COLORS[i] : PIE_OTHER_COLOR;
    const sliceIndex = i < top.length ? i : slices.length - 1;
    const li = document.createElement('li');
    li.className = 'legend-item';
    li.innerHTML = `
      <span class="legend-swatch" style="background:${color}"></span>
      <span class="legend-name">${escapeHtml(p.name)}</span>
      <span class="legend-qty">${p.quantity} Stk.</span>
      <span class="legend-pct">${formatPercent(p.percent)}</span>`;
    li.addEventListener('pointerenter', () => highlightSlice(sliceIndex));
    li.addEventListener('pointerleave', () => highlightSlice(-1));
    legend.appendChild(li);
  });

  saveHomeToFirebase(latest, total, products);
}

function highlightSlice(index) {
  document.querySelectorAll('#pie-chart .pie-slice').forEach((el) => {
    el.classList.toggle('dim', index >= 0 && Number(el.dataset.index) !== index);
  });
}

function showPieTooltip(e, slice) {
  const tooltip = document.getElementById('pie-tooltip');
  const wrap = tooltip.parentElement.getBoundingClientRect();
  tooltip.innerHTML = `<strong>${escapeHtml(slice.name)}</strong><span>${slice.quantity} Stk. · ${formatPercent(slice.percent)}</span>`;
  tooltip.style.left = (e.clientX - wrap.left) + 'px';
  tooltip.style.top = (e.clientY - wrap.top) + 'px';
  tooltip.classList.add('show');
}

// Diagramm-Daten in Firebase unter "home" speichern (nur wenn sich etwas geändert hat)
function saveHomeToFirebase(latest, total, products) {
  const data = latest ? {
    inventoryKey: latest.firebaseKey,
    inventoryName: latest.name || '',
    inventoryCreatedAt: latest.createdAt || '',
    totalQuantity: total,
    products: products.map(p => ({ name: p.name, quantity: p.quantity, percent: p.percent }))
  } : null;
  const json = JSON.stringify(data);
  if (json === lastSavedHomeJson) return;
  lastSavedHomeJson = json;
  const payload = data ? { ...data, updatedAt: new Date().toISOString() } : null;
  db.ref('home').set(payload).catch((err) => {
    console.error('Home konnte nicht gespeichert werden:', err);
    lastSavedHomeJson = '';
  });
}

// Firebase Realtime Listener – hält die Liste IMMER live synchron
function listenToFirebase() {
  inventoriesRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Firebase gibt ein Objekt zurück, wir machen ein Array daraus
      inventories = Object.keys(data).map(key => ({
        firebaseKey: key,
        ...data[key]
      }));
      // Neueste zuerst
      inventories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      inventories = [];
    }
    renderInventoryList();
    renderHome();
  }, (error) => {
    console.error('Firebase Fehler:', error);
    inventoryList.innerHTML = '<p class="empty-msg">Verbindung zur Datenbank fehlgeschlagen. Prüfe die Firebase-Regeln.</p>';
  });
}

function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ---------- UI-Hilfsfunktionen ----------
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatShortDate(isoString) {
  if (!isoString) return '–';
  return new Date(isoString).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatEuro(val) {
  return Number(val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

// Summen einer Inventur: Produkte, Stückzahl, Warenwert EK/VK
function calcTotals(items) {
  const list = items || [];
  let qty = 0, ek = 0, vk = 0, hasEk = false, hasVk = false;
  list.forEach((it) => {
    const q = Number(it.quantity) || 0;
    qty += q;
    if (it.ek !== null && it.ek !== undefined && !isNaN(it.ek)) { ek += q * Number(it.ek); hasEk = true; }
    if (it.vk !== null && it.vk !== undefined && !isNaN(it.vk)) { vk += q * Number(it.vk); hasVk = true; }
  });
  return { products: list.length, qty, ek, vk, hasEk, hasVk };
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.innerHTML = `<span class="toast-dot"></span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 2600);
}

function renderStats() {
  const statCount = document.getElementById('stat-count');
  const statLast = document.getElementById('stat-last');
  const statLastHint = document.getElementById('stat-last-hint');
  const statValue = document.getElementById('stat-value');
  if (!statCount) return;

  statCount.textContent = inventories.length;
  const latest = inventories[0];
  if (latest) {
    const t = calcTotals(latest.items);
    statLast.textContent = formatShortDate(latest.createdAt);
    statLastHint.textContent = latest.name || '';
    statValue.textContent = t.hasVk ? formatEuro(t.vk) : '–';
  } else {
    statLast.textContent = '–';
    statLastHint.innerHTML = '&nbsp;';
    statValue.textContent = '–';
  }
}

const ICONS = {
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>',
  sheet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M12 18v-6M9 15l3 3 3-3"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>'
};

function renderInventoryList() {
  inventoryList.innerHTML = '';
  inventoryCount.textContent = `${inventories.length} ${inventories.length === 1 ? 'Eintrag' : 'Einträge'}`;
  renderStats();

  const slice = inventories.slice(0, displayedLimit);

  if (slice.length === 0) {
    inventoryList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${ICONS.clipboard}</div>
        <h3>Noch keine Inventuren</h3>
        <button type="button" class="btn primary-btn" id="empty-create-btn">+ Inventur erstellen</button>
      </div>`;
    document.getElementById('empty-create-btn').addEventListener('click', () => openCreateBtn.click());
    return;
  }

  slice.forEach((inv) => {
    const card = document.createElement('div');
    card.className = 'inventory-card';
    const totals = calcTotals(inv.items);
    const titleText = inv.name ? inv.name : `Inventur vom ${formatDate(inv.createdAt)}`;

    card.innerHTML = `
      <div class="card-icon">${ICONS.clipboard}</div>
      <div class="card-main">
        <div class="card-title">${escapeHtml(titleText)}</div>
        <div class="card-meta">
          <span>Erstellt: ${formatDate(inv.createdAt)}</span>
          ${inv.updatedAt !== inv.createdAt ? `<span class="dot">·</span><span>Bearbeitet: ${formatDate(inv.updatedAt)}</span>` : ''}
          <span class="dot">·</span><span>${totals.products} ${totals.products === 1 ? 'Produkt' : 'Produkte'}</span>
        </div>
      </div>
      <div class="card-right-actions">
        <div class="card-figures">
          <div class="card-badge">${totals.qty} Stk.</div>
          ${totals.hasVk ? `<div class="card-value">${formatEuro(totals.vk)}</div>` : ''}
        </div>
        <div class="card-menu-wrapper">
          <button class="card-menu-btn" aria-label="Menü" title="Menü">&#8942;</button>
          <div class="card-dropdown-menu">
            <button class="card-dropdown-item" data-action="download-excel">${ICONS.sheet}Download Excel</button>
            <button class="card-dropdown-item" data-action="download-pdf">${ICONS.file}Download PDF</button>
            <div class="dropdown-sep"></div>
            <button class="card-dropdown-item" data-action="duplicate">${ICONS.copy}Duplizieren</button>
          </div>
        </div>
      </div>
    `;

    // Klick auf Karte öffnet Details (aber nicht wenn Menü-Button geklickt)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-menu-wrapper')) return;
      requireAuth().then((ok) => { if (ok) openDetail(inv.firebaseKey); });
    });

    // 3-Punkte-Menü Toggle
    const menuBtn = card.querySelector('.card-menu-btn');
    const dropdown = card.querySelector('.card-dropdown-menu');

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Alle anderen Dropdowns schließen
      document.querySelectorAll('.card-dropdown-menu.open').forEach(m => {
        if (m !== dropdown) m.classList.remove('open');
      });
      dropdown.classList.toggle('open');
    });

    // Download Excel
    card.querySelector('[data-action="download-excel"]').addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.remove('open');
      requireAuth().then((ok) => { if (ok) downloadInventoryExcel(inv); });
    });

    // Download PDF
    card.querySelector('[data-action="download-pdf"]').addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.remove('open');
      requireAuth().then((ok) => { if (ok) downloadInventoryPDF(inv); });
    });

    // Duplizieren
    card.querySelector('[data-action="duplicate"]').addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.remove('open');
      requireAuth().then((ok) => { if (ok) duplicateInventory(inv); });
    });

    inventoryList.appendChild(card);
  });
}

// Inventur duplizieren: gleicher Inhalt, aber Erstellt-Datum = jetzt
function duplicateInventory(inv) {
  const now = new Date().toISOString();
  const { firebaseKey, ...data } = inv;
  const copy = {
    ...JSON.parse(JSON.stringify(data)),
    createdAt: now,
    updatedAt: now
  };
  inventoriesRef.push(copy)
    .then(() => showToast('Inventur dupliziert'))
    .catch((err) => {
      showToast('Fehler beim Duplizieren: ' + err.message, 'error');
    });
}

// Globaler Klick schließt alle offenen Dropdown-Menüs
document.addEventListener('click', () => {
  document.querySelectorAll('.card-dropdown-menu.open').forEach(m => m.classList.remove('open'));
});

// Hilfsfunktion: Inventurdaten als Array aufbereiten
function buildInventoryData(inventory) {
  const items = inventory.items || [];
  const rows = items.map(item => {
    const menge = item.quantity || 0;
    const ek = (item.ek !== null && item.ek !== undefined) ? Number(item.ek) : 0;
    const vk = (item.vk !== null && item.vk !== undefined) ? Number(item.vk) : 0;
    const ausgaben = menge * ek;
    const gewinn = (vk - ek) * menge;
    return { name: item.name || '', menge, ek, vk, ausgaben, gewinn };
  });

  let gesamtMenge = 0, gesamtAusgaben = 0, gesamtGewinn = 0;
  rows.forEach(r => {
    gesamtMenge += r.menge;
    gesamtAusgaben += r.ausgaben;
    gesamtGewinn += r.gewinn;
  });

  return { rows, gesamtMenge, gesamtAusgaben, gesamtGewinn };
}

// Hilfsfunktion: Dateiname generieren
function buildFileName(inventory, ext) {
  const invName = (inventory.name || 'Inventur').replace(/\s+/g, '-');
  const d = new Date(inventory.createdAt);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${invName}_${day}.${month}.${year}.${ext}`;
}

// Excel-Download mit xlsx-js-style (styled)
function downloadInventoryExcel(inventory) {
  const { rows, gesamtMenge, gesamtAusgaben, gesamtGewinn } = buildInventoryData(inventory);
  const headers = ['Produkt', 'Menge', 'Einkaufspreis', 'Verkaufspreis', 'Ausgaben', 'Gewinn'];

  // Hilfsfunktion: Preis als sauberen Text formatieren
  function priceText(val) {
    if (val === null || val === undefined || val === '') return '';
    return Number(val).toFixed(2) + ' \u20AC';
  }

  // Dünner Rahmen für alle Zellen
  const thinBorder = {
    top: { style: 'thin', color: { rgb: 'D1D5DB' } },
    bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
    left: { style: 'thin', color: { rgb: 'D1D5DB' } },
    right: { style: 'thin', color: { rgb: 'D1D5DB' } }
  };

  // Header-Style: Leichter gelber Textmarker-Hintergrund, fett
  const headerStyle = {
    font: { bold: true, sz: 10 },
    fill: { fgColor: { rgb: 'FFF3CD' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder
  };

  // Normale Zellen
  const cellStyle = { border: thinBorder, alignment: { vertical: 'center' } };
  const cellStyleRight = { border: thinBorder, alignment: { horizontal: 'right', vertical: 'center' } };

  // GESAMT-Style: Leichter grüner Textmarker-Hintergrund, fett
  const gesamtStyle = {
    font: { bold: true, sz: 10 },
    fill: { fgColor: { rgb: 'D4EDDA' } },
    alignment: { vertical: 'center' },
    border: thinBorder
  };
  const gesamtStyleRight = {
    font: { bold: true, sz: 10 },
    fill: { fgColor: { rgb: 'D4EDDA' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder
  };

  // Alle Zeilen als Array of Arrays aufbauen
  const aoa = [];

  // Header
  aoa.push(headers);

  // Datenzeilen: Menge als Zahl, Preise als Text mit €
  rows.forEach(r => {
    aoa.push([
      r.name,
      r.menge,
      priceText(r.ek),
      priceText(r.vk),
      priceText(r.ausgaben),
      priceText(r.gewinn)
    ]);
  });

  // GESAMT-Zeile
  aoa.push([
    'GESAMT',
    gesamtMenge,
    '',
    '',
    priceText(gesamtAusgaben),
    priceText(gesamtGewinn)
  ]);

  // Worksheet erstellen
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Styles anwenden
  const totalRows = aoa.length;
  const totalCols = headers.length;
  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) continue;

      if (r === 0) {
        // Header-Zeile
        ws[cellRef].s = headerStyle;
      } else if (r === totalRows - 1) {
        // GESAMT-Zeile
        ws[cellRef].s = (c >= 1) ? gesamtStyleRight : gesamtStyle;
      } else {
        // Normale Datenzeile
        ws[cellRef].s = (c >= 1) ? cellStyleRight : cellStyle;
      }
    }
  }

  // Spaltenbreiten
  ws['!cols'] = [
    { wch: 24 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventur');
  XLSX.writeFile(wb, buildFileName(inventory, 'xlsx'));
}

// PDF-Download mit jsPDF + autotable (kompatibel mit iOS/iPadOS, Android & Desktop)
function downloadInventoryPDF(inventory) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('PDF-Bibliothek wird noch geladen. Bitte kurz warten...');
    return;
  }

  const { rows, gesamtMenge, gesamtAusgaben, gesamtGewinn } = buildInventoryData(inventory);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Titel
  const titleText = inventory.name || 'Inventur';
  const d = new Date(inventory.createdAt);
  const dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(titleText, 14, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(`Erstellt am: ${dateStr}`, 14, 28);
  doc.setTextColor(0);

  // Hilfsfunktion: Preis-Text
  function priceStr(val) {
    if (val === null || val === undefined || val === '') return '';
    return Number(val).toFixed(2) + ' €';
  }

  // Tabellen-Daten
  const tableHead = [['Produkt', 'Menge', 'Einkaufspreis', 'Verkaufspreis', 'Ausgaben', 'Gewinn']];
  const tableBody = rows.map(r => [
    r.name,
    String(r.menge),
    priceStr(r.ek),
    priceStr(r.vk),
    priceStr(r.ausgaben),
    priceStr(r.gewinn)
  ]);

  // GESAMT-Zeile
  tableBody.push([
    'GESAMT',
    String(gesamtMenge),
    '',
    '',
    priceStr(gesamtAusgaben),
    priceStr(gesamtGewinn)
  ]);

  const lastRowIdx = tableBody.length - 1;

  doc.autoTable({
    head: tableHead,
    body: tableBody,
    startY: 34,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 243, 205], // Textmarker Gelb wie Excel
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' }
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.row.index === lastRowIdx) {
        // Textmarker Grün wie Excel
        data.cell.styles.fillColor = [212, 237, 218];
        data.cell.styles.textColor = [0, 0, 0];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 10;
      }
    }
  });

  const fileName = buildFileName(inventory, 'pdf');

  // PDF als octet-stream Blob exportieren, damit Safari/iPadOS die Datei herunterlädt statt sie nur im Browser anzuzeigen
  const pdfBlob = doc.output('blob');
  const forcedBlob = new Blob([pdfBlob], { type: 'application/octet-stream' });

  if (window.saveAs) {
    window.saveAs(forcedBlob, fileName);
  } else {
    const blobUrl = URL.createObjectURL(forcedBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 2000);
  }
}

// Infinite Scroll Observer
function setupInfiniteScroll() {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && displayedLimit < inventories.length) {
      displayedLimit += 10;
      renderInventoryList();
    }
  }, {
    root: inventoryFrame || null,
    threshold: 0.1
  });

  observer.observe(scrollSentinel);
}

// Create Modal Logic (Schritt 1: Name -> Schritt 2: Produkte)
function setupCreateModal() {
  // Öffne Schritt 1: Name
  openCreateBtn.addEventListener('click', async () => {
    if (!(await requireAuth())) return;
    inventoryNameInput.value = '';
    openModal(nameModal);
    setTimeout(() => inventoryNameInput.focus(), 150);
  });

  closeNameModal.addEventListener('click', () => {
    closeModal(nameModal);
  });

  function proceedToProducts() {
    const enteredName = inventoryNameInput.value.trim();
    if (!enteredName) {
      inventoryNameInput.focus();
      return;
    }
    currentInventoryName = enteredName;
    closeModal(nameModal);

    // Initialisiere Schritt 2
    tempItems = [];
    renderTempItems();
    if (createModalTitle) createModalTitle.textContent = currentInventoryName;
    if (createModalSubtitle) createModalSubtitle.textContent = `Erstellt am: ${formatDate(new Date().toISOString())}`;
    openModal(createModal);
  }

  nameNextBtn.addEventListener('click', proceedToProducts);
  inventoryNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      proceedToProducts();
    }
  });

  closeCreateModal.addEventListener('click', () => {
    closeModal(createModal);
  });

  addItemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = productNameInput.value.trim();
    const quantity = parseInt(productQtyInput.value, 10);
    const ek = productEkInput.value ? parseFloat(productEkInput.value) : null;
    const vk = productVkInput.value ? parseFloat(productVkInput.value) : null;

    if (!name) {
      // Leer: Fokus ins Feld setzen, um darauf hinzuweisen
      productNameInput.focus();
      return;
    }

    if (quantity > 0) {
      tempItems.push({ name, quantity, ek, vk });
      productNameInput.value = '';
      productQtyInput.value = '1';
      productEkInput.value = '';
      productVkInput.value = '';
      // Tastatur/Eingabefeld schließen (blur), damit es auf Handys/Tablets nicht aufploppt
      productNameInput.blur();
      productQtyInput.blur();
      productEkInput.blur();
      productVkInput.blur();
      if (document.activeElement) document.activeElement.blur();
      renderTempItems();
    }
  });

  finishInventoryBtn.addEventListener('click', async () => {
    if (tempItems.length === 0) return;

    finishInventoryBtn.disabled = true;
    finishInventoryBtn.textContent = 'Wird gespeichert...';
    if (!(await requireAuth())) {
      finishInventoryBtn.disabled = false;
      finishInventoryBtn.textContent = 'Fertigstellen';
      return;
    }

    const now = new Date().toISOString();
    const newInventory = {
      name: currentInventoryName || `Inventur vom ${formatDate(now)}`,
      createdAt: now,
      updatedAt: now,
      items: [...tempItems]
    };

    // In Firebase speichern – push() erzeugt automatisch eine einzigartige ID
    inventoriesRef.push(newInventory)
      .then(() => {
        closeModal(createModal);
        showToast('Inventur gespeichert');
        finishInventoryBtn.textContent = 'Fertigstellen';
        finishInventoryBtn.disabled = false;
        // Liste aktualisiert sich automatisch durch den Realtime Listener!
      })
      .catch((err) => {
        alert('Fehler beim Speichern: ' + err.message);
        finishInventoryBtn.textContent = 'Fertigstellen';
        finishInventoryBtn.disabled = false;
      });
  });
}

function formatPrice(val) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return Number(val).toFixed(2) + ' €';
}

function renderTempItems() {
  tempItemsTbody.innerHTML = '';
  if (tempItems.length === 0) {
    emptyTableMsg.style.display = 'block';
    finishInventoryBtn.disabled = true;
    return;
  }
  emptyTableMsg.style.display = 'none';
  finishInventoryBtn.disabled = false;

  tempItems.forEach((it, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(it.name)}</td>
      <td class="text-right">${it.quantity}</td>
      <td class="text-right">${formatPrice(it.ek)}</td>
      <td class="text-right">${formatPrice(it.vk)}</td>
      <td class="text-center">
        <button type="button" class="del-btn" data-index="${idx}">Entfernen</button>
      </td>
    `;
    tr.querySelector('.del-btn').addEventListener('click', () => {
      tempItems.splice(idx, 1);
      renderTempItems();
    });
    tempItemsTbody.appendChild(tr);
  });
}

// Details & Edit Logic
function openDetail(firebaseKey) {
  const inv = inventories.find(i => i.firebaseKey === firebaseKey);
  if (!inv) return;

  currentViewingId = firebaseKey;
  currentEditingItems = JSON.parse(JSON.stringify(inv.items || []));
  isEditMode = false;

  detailTitle.textContent = inv.name ? inv.name : 'Inventur-Details';
  detailCreated.textContent = `Erstellt: ${formatDate(inv.createdAt)}`;
  detailUpdated.textContent = inv.updatedAt !== inv.createdAt ? `Bearbeitet: ${formatDate(inv.updatedAt)}` : '';

  updateEditView();
  renderDetailItems();
  openModal(detailModal);
}

function setupDetailModal() {
  closeDetailModal.addEventListener('click', () => {
    closeModal(detailModal);
  });

  toggleEditBtn.addEventListener('click', async () => {
    if (!(await requireAuth())) return;
    isEditMode = !isEditMode;
    updateEditView();
  });

  editAddItemBtn.addEventListener('click', () => {
    const name = editProductName.value.trim();
    const qty = parseInt(editProductQty.value, 10);
    const ek = editProductEk.value ? parseFloat(editProductEk.value) : null;
    const vk = editProductVk.value ? parseFloat(editProductVk.value) : null;

    if (!name) {
      editProductName.focus();
      return;
    }
    if (qty > 0) {
      currentEditingItems.push({ name, quantity: qty, ek, vk });
      editProductName.value = '';
      editProductQty.value = '1';
      editProductEk.value = '';
      editProductVk.value = '';
      editProductName.blur();
      editProductQty.blur();
      editProductEk.blur();
      editProductVk.blur();
      if (document.activeElement) document.activeElement.blur();
      renderDetailItems();
    }
  });

  // Speichern
  saveEditBtn.addEventListener('click', async () => {
    saveEditBtn.disabled = true;
    saveEditBtn.textContent = 'Speichern...';
    if (!(await requireAuth())) {
      saveEditBtn.disabled = false;
      saveEditBtn.textContent = 'Änderungen speichern';
      return;
    }

    const updates = {
      items: [...currentEditingItems],
      updatedAt: new Date().toISOString()
    };

    inventoriesRef.child(currentViewingId).update(updates)
      .then(() => {
        saveEditBtn.disabled = false;
        saveEditBtn.textContent = 'Änderungen speichern';
        closeModal(detailModal);
        showToast('Änderungen gespeichert');
      })
      .catch((err) => {
        alert('Fehler: ' + err.message);
        saveEditBtn.disabled = false;
        saveEditBtn.textContent = 'Änderungen speichern';
      });
  });

  // Löschen Flow
  deleteInventoryBtn.addEventListener('click', async () => {
    if (!(await requireAuth())) return;
    confirmDeleteInput.value = '';
    executeDeleteBtn.disabled = true;
    openModal(confirmDeleteModal);
    confirmDeleteInput.focus();
  });

  function closeConfirmModal() {
    closeModal(confirmDeleteModal);
    confirmDeleteInput.value = '';
    executeDeleteBtn.disabled = true;
  }

  closeConfirmDeleteModal.addEventListener('click', closeConfirmModal);
  cancelConfirmDeleteBtn.addEventListener('click', closeConfirmModal);

  confirmDeleteInput.addEventListener('input', () => {
    const val = confirmDeleteInput.value.trim().toLowerCase();
    executeDeleteBtn.disabled = val !== 'löschen';
  });

  executeDeleteBtn.addEventListener('click', async () => {
    if (executeDeleteBtn.disabled) return;
    executeDeleteBtn.disabled = true;
    executeDeleteBtn.textContent = 'Wird gelöscht...';
    if (!(await requireAuth())) {
      executeDeleteBtn.textContent = 'Löschen';
      return;
    }

    // Nicht endgültig löschen: Inventur nach "deleted" verschieben (in einem Schritt),
    // damit sie in der Datenbank erhalten bleibt und nur von der Website verschwindet.
    const key = currentViewingId;
    inventoriesRef.child(key).once('value')
      .then((snap) => {
        const data = snap.val();
        if (!data) throw new Error('Inventur nicht gefunden.');
        return db.ref().update({
          [`deleted/${key}`]: { ...data, deletedAt: new Date().toISOString() },
          [`inventories/${key}`]: null
        });
      })
      .then(() => {
        executeDeleteBtn.textContent = 'Löschen';
        executeDeleteBtn.disabled = true;
        closeConfirmModal();
        closeModal(detailModal);
        showToast('Inventur gelöscht');
      })
      .catch((err) => {
        alert('Fehler: ' + err.message);
        executeDeleteBtn.textContent = 'Löschen';
      });
  });
}

function updateEditView() {
  if (isEditMode) {
    toggleEditBtn.textContent = 'Abbrechen';
    saveEditBtn.classList.remove('hidden');
    editControls.classList.remove('hidden');
  } else {
    toggleEditBtn.textContent = 'Bearbeiten';
    saveEditBtn.classList.add('hidden');
    editControls.classList.add('hidden');
    const inv = inventories.find(i => i.firebaseKey === currentViewingId);
    if (inv) currentEditingItems = JSON.parse(JSON.stringify(inv.items || []));
  }
  renderDetailItems();
}

function renderDetailSummary() {
  const el = document.getElementById('detail-summary');
  if (!el) return;
  const t = calcTotals(currentEditingItems);
  const profit = t.vk - t.ek;
  el.innerHTML = `
    <div class="summary-chip"><div class="stat-label">Stück</div><div class="stat-value">${t.qty}</div></div>
    <div class="summary-chip"><div class="stat-label">Wert (VK)</div><div class="stat-value">${t.hasVk ? formatEuro(t.vk) : '–'}</div></div>
    <div class="summary-chip ${t.hasEk && t.hasVk && profit > 0 ? 'positive' : ''}"><div class="stat-label">Gewinn</div><div class="stat-value">${t.hasEk && t.hasVk ? formatEuro(profit) : '–'}</div></div>
  `;
}

function renderDetailItems() {
  renderDetailSummary();
  detailItemsTbody.innerHTML = '';
  const editHeaders = document.querySelectorAll('.edit-col');
  editHeaders.forEach(el => el.classList.toggle('hidden', !isEditMode));

  currentEditingItems.forEach((it, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(it.name)}</td>
      <td class="text-right">${it.quantity}</td>
      <td class="text-right">${formatPrice(it.ek)}</td>
      <td class="text-right">${formatPrice(it.vk)}</td>
      ${isEditMode ? `<td class="text-center"><button class="del-btn" data-idx="${idx}">Entfernen</button></td>` : ''}
    `;

    if (isEditMode) {
      tr.querySelector('.del-btn').addEventListener('click', () => {
        currentEditingItems.splice(idx, 1);
        renderDetailItems();
      });
    }

    detailItemsTbody.appendChild(tr);
  });
}
