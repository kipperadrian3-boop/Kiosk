const API_URL = '/api/inventories';

// State
let inventories = [];
let tempItems = [];
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
const createModal = document.getElementById('create-modal');
const closeCreateModal = document.getElementById('close-create-modal');

const addItemForm = document.getElementById('add-item-form');
const productNameInput = document.getElementById('product-name');
const productQtyInput = document.getElementById('product-qty');
const tempItemsTbody = document.getElementById('temp-items-tbody');
const emptyTableMsg = document.getElementById('empty-table-msg');
const finishInventoryBtn = document.getElementById('finish-inventory-btn');

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
const editAddItemBtn = document.getElementById('edit-add-item-btn');

let currentEditingItems = [];

// Init
document.addEventListener('DOMContentLoaded', () => {
  setupDrawer();
  setupCreateModal();
  setupDetailModal();
  setupInfiniteScroll();
  fetchInventories();
});

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
    closeDrawer();
  });
}

// Fetch & Render Inventories
async function fetchInventories() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Fehler beim Abrufen');
    inventories = await res.json();
    renderInventoryList();
  } catch (err) {
    console.error(err);
    inventoryList.innerHTML = '<p class="empty-msg">Konnte Inventuren nicht laden (Server offline?).</p>';
  }
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

function renderInventoryList() {
  inventoryList.innerHTML = '';
  inventoryCount.textContent = `${inventories.length} Einträge`;

  const slice = inventories.slice(0, displayedLimit);

  if (slice.length === 0) {
    inventoryList.innerHTML = '<p class="empty-msg">Noch keine Inventuren vorhanden. Klicke auf "+ Inventur erstellen".</p>';
    return;
  }

  slice.forEach((inv) => {
    const card = document.createElement('div');
    card.className = 'inventory-card';
    const totalCount = inv.items.reduce((sum, it) => sum + it.quantity, 0);

    card.innerHTML = `
      <div>
        <div class="card-title">Inventur vom ${formatDate(inv.createdAt)}</div>
        <div class="card-meta">
          <span>Erstellt: ${formatDate(inv.createdAt)}</span>
          ${inv.updatedAt !== inv.createdAt ? `<span>Bearbeitet: ${formatDate(inv.updatedAt)}</span>` : ''}
        </div>
      </div>
      <div class="card-badge">${inv.items.length} Positionen (${totalCount} Stk.)</div>
    `;

    card.addEventListener('click', () => openDetail(inv.id));
    inventoryList.appendChild(card);
  });
}

// Infinite Scroll Observer
function setupInfiniteScroll() {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && displayedLimit < inventories.length) {
      displayedLimit += 10;
      renderInventoryList();
    }
  }, { threshold: 0.1 });

  observer.observe(scrollSentinel);
}

// Create Modal Logic
function setupCreateModal() {
  openCreateBtn.addEventListener('click', () => {
    tempItems = [];
    renderTempItems();
    createModal.classList.add('open');
  });

  closeCreateModal.addEventListener('click', () => {
    createModal.classList.remove('open');
  });

  addItemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = productNameInput.value.trim();
    const quantity = parseInt(productQtyInput.value, 10);

    if (name && quantity > 0) {
      tempItems.push({ name, quantity });
      productNameInput.value = '';
      productQtyInput.value = '1';
      productNameInput.focus();
      renderTempItems();
    }
  });

  finishInventoryBtn.addEventListener('click', async () => {
    if (tempItems.length === 0) return;
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: tempItems })
      });
      if (res.ok) {
        createModal.classList.remove('open');
        await fetchInventories();
      }
    } catch (err) {
      alert('Fehler beim Speichern der Inventur');
    }
  });
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
      <td>${it.name}</td>
      <td class="text-right">${it.quantity}</td>
      <td class="text-center">
        <button type="button" class="del-btn" data-index="${idx}">&times;</button>
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
function openDetail(id) {
  const inv = inventories.find(i => i.id === id);
  if (!inv) return;

  currentViewingId = id;
  currentEditingItems = JSON.parse(JSON.stringify(inv.items));
  isEditMode = false;

  detailTitle.textContent = `Inventur-Details`;
  detailCreated.textContent = `Erstellt: ${formatDate(inv.createdAt)}`;
  detailUpdated.textContent = inv.updatedAt !== inv.createdAt ? `Geändert: ${formatDate(inv.updatedAt)}` : '';

  updateEditView();
  renderDetailItems();
  detailModal.classList.add('open');
}

function setupDetailModal() {
  closeDetailModal.addEventListener('click', () => {
    detailModal.classList.remove('open');
  });

  toggleEditBtn.addEventListener('click', () => {
    isEditMode = !isEditMode;
    updateEditView();
  });

  editAddItemBtn.addEventListener('click', () => {
    const name = editProductName.value.trim();
    const qty = parseInt(editProductQty.value, 10);
    if (name && qty > 0) {
      currentEditingItems.push({ name, quantity: qty });
      editProductName.value = '';
      editProductQty.value = '1';
      renderDetailItems();
    }
  });

  saveEditBtn.addEventListener('click', async () => {
    try {
      const res = await fetch(`${API_URL}/${currentViewingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: currentEditingItems })
      });
      if (res.ok) {
        detailModal.classList.remove('open');
        await fetchInventories();
      }
    } catch (err) {
      alert('Fehler beim Aktualisieren');
    }
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
    // Zurücksetzen
    const inv = inventories.find(i => i.id === currentViewingId);
    if (inv) currentEditingItems = JSON.parse(JSON.stringify(inv.items));
  }
  renderDetailItems();
}

function renderDetailItems() {
  detailItemsTbody.innerHTML = '';
  const editHeaders = document.querySelectorAll('.edit-col');
  editHeaders.forEach(el => el.classList.toggle('hidden', !isEditMode));

  currentEditingItems.forEach((it, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${it.name}</td>
      <td class="text-right">${it.quantity}</td>
      ${isEditMode ? `<td class="text-center"><button class="del-btn" data-idx="${idx}">&times;</button></td>` : ''}
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
