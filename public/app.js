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
  listenToFirebase();
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

function renderInventoryList() {
  inventoryList.innerHTML = '';
  inventoryCount.textContent = `${inventories.length} Einträge`;

  const slice = inventories.slice(0, displayedLimit);

  if (slice.length === 0) {
    inventoryList.innerHTML = '';
    return;
  }

  slice.forEach((inv) => {
    const card = document.createElement('div');
    card.className = 'inventory-card';
    const items = inv.items || [];
    const totalCount = items.reduce((sum, it) => sum + it.quantity, 0);
    const titleText = inv.name ? inv.name : `Inventur vom ${formatDate(inv.createdAt)}`;

    card.innerHTML = `
      <div>
        <div class="card-title">${titleText}</div>
        <div class="card-meta">
          <span>Erstellt: ${formatDate(inv.createdAt)}</span>
          ${inv.updatedAt !== inv.createdAt ? `<span>Bearbeitet: ${formatDate(inv.updatedAt)}</span>` : ''}
        </div>
      </div>
      <div class="card-right-actions">
        <div class="card-badge">${totalCount} Stk.</div>
        <div class="card-menu-wrapper">
          <button class="card-menu-btn" aria-label="Menü" title="Menü">&#8942;</button>
          <div class="card-dropdown-menu">
            <button class="card-dropdown-item" data-action="download">Download</button>
          </div>
        </div>
      </div>
    `;

    // Klick auf Karte öffnet Details (aber nicht wenn Menü-Button geklickt)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-menu-wrapper')) return;
      openDetail(inv.firebaseKey);
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

    // Download-Button
    const downloadBtn = card.querySelector('[data-action="download"]');
    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.remove('open');
      downloadInventoryExcel(inv);
    });

    inventoryList.appendChild(card);
  });
}

// Globaler Klick schließt alle offenen Dropdown-Menüs
document.addEventListener('click', () => {
  document.querySelectorAll('.card-dropdown-menu.open').forEach(m => m.classList.remove('open'));
});

// Excel-Download mit SheetJS
function downloadInventoryExcel(inventory) {
  const items = inventory.items || [];

  // Datenzeilen aufbauen
  const rows = items.map(item => {
    const menge = item.quantity || 0;
    const ek = (item.ek !== null && item.ek !== undefined) ? Number(item.ek) : 0;
    const vk = (item.vk !== null && item.vk !== undefined) ? Number(item.vk) : 0;
    const ausgaben = menge * ek;
    const gewinn = (vk - ek) * menge;
    return {
      'Produkt': item.name || '',
      'Menge': menge,
      'Einkaufspreis': ek,
      'Verkaufspreis': vk,
      'Ausgaben': ausgaben,
      'Gewinn': gewinn
    };
  });

  // GESAMT-Zeile
  let gesamtMenge = 0, gesamtAusgaben = 0, gesamtGewinn = 0;
  rows.forEach(r => {
    gesamtMenge += r['Menge'];
    gesamtAusgaben += r['Ausgaben'];
    gesamtGewinn += r['Gewinn'];
  });

  rows.push({
    'Produkt': 'GESAMT',
    'Menge': gesamtMenge,
    'Einkaufspreis': '',
    'Verkaufspreis': '',
    'Ausgaben': gesamtAusgaben,
    'Gewinn': gesamtGewinn
  });

  // Worksheet erstellen
  const ws = XLSX.utils.json_to_sheet(rows);

  // Spaltenbreiten setzen
  ws['!cols'] = [
    { wch: 22 }, // Produkt
    { wch: 10 }, // Menge
    { wch: 16 }, // Einkaufspreis
    { wch: 16 }, // Verkaufspreis
    { wch: 14 }, // Ausgaben
    { wch: 14 }  // Gewinn
  ];

  // Workbook erstellen und exportieren
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventur');

  // Dateiname: [inventur-name]_[erstelldatum].xlsx
  const invName = (inventory.name || 'Inventur').replace(/\s+/g, '-');
  const d = new Date(inventory.createdAt);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const datePart = `${day}.${month}.${year}`;
  const fileName = `${invName}_${datePart}.xlsx`;

  XLSX.writeFile(wb, fileName);
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
  openCreateBtn.addEventListener('click', () => {
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

  finishInventoryBtn.addEventListener('click', () => {
    if (tempItems.length === 0) return;

    finishInventoryBtn.disabled = true;
    finishInventoryBtn.textContent = 'Wird gespeichert...';

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
      <td>${it.name}</td>
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

  toggleEditBtn.addEventListener('click', () => {
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
  saveEditBtn.addEventListener('click', () => {
    saveEditBtn.disabled = true;
    saveEditBtn.textContent = 'Speichern...';

    const updates = {
      items: [...currentEditingItems],
      updatedAt: new Date().toISOString()
    };

    inventoriesRef.child(currentViewingId).update(updates)
      .then(() => {
        saveEditBtn.disabled = false;
        saveEditBtn.textContent = 'Änderungen speichern';
        closeModal(detailModal);
      })
      .catch((err) => {
        alert('Fehler: ' + err.message);
        saveEditBtn.disabled = false;
        saveEditBtn.textContent = 'Änderungen speichern';
      });
  });

  // Löschen Flow
  deleteInventoryBtn.addEventListener('click', () => {
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

  executeDeleteBtn.addEventListener('click', () => {
    if (executeDeleteBtn.disabled) return;
    executeDeleteBtn.disabled = true;
    executeDeleteBtn.textContent = 'Wird gelöscht...';

    inventoriesRef.child(currentViewingId).remove()
      .then(() => {
        executeDeleteBtn.textContent = 'Löschen';
        executeDeleteBtn.disabled = true;
        closeConfirmModal();
        closeModal(detailModal);
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

function renderDetailItems() {
  detailItemsTbody.innerHTML = '';
  const editHeaders = document.querySelectorAll('.edit-col');
  editHeaders.forEach(el => el.classList.toggle('hidden', !isEditMode));

  currentEditingItems.forEach((it, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${it.name}</td>
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
