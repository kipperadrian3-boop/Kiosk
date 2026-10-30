const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Für Vercel Serverless: Im /tmp Verzeichnis speichern, da das Root-Dateisystem read-only ist
const IS_VERCEL = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
const DATA_FILE = IS_VERCEL
  ? path.join('/tmp', 'inventory.json')
  : path.join(__dirname, 'data', 'inventory.json');

const INITIAL_FILE = path.join(__dirname, 'data', 'inventory.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// In-Memory Fallback für Serverless Instanzen
let memoryStore = null;

function readData() {
  if (memoryStore !== null) {
    return memoryStore;
  }
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      memoryStore = JSON.parse(content || '[]');
      return memoryStore;
    } else if (fs.existsSync(INITIAL_FILE)) {
      const content = fs.readFileSync(INITIAL_FILE, 'utf-8');
      memoryStore = JSON.parse(content || '[]');
      return memoryStore;
    }
  } catch (err) {
    console.error('Fehler beim Lesen:', err);
  }
  memoryStore = [];
  return memoryStore;
}

function writeData(data) {
  memoryStore = data;
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Fehler beim Speichern in Datei (Memory Fallback aktiv):', err);
  }
}

// GET /api/inventories - Alle Inventuren abrufen
app.get('/api/inventories', (req, res) => {
  const data = readData();
  const sorted = [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

// POST /api/inventories - Neue Inventur erstellen
app.post('/api/inventories', (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Keine Artikel angegeben' });
  }

  const data = readData();
  const now = new Date().toISOString();
  const newInventory = {
    id: Date.now().toString(),
    createdAt: now,
    updatedAt: now,
    items: items.map(item => ({
      name: String(item.name || '').trim(),
      quantity: Number(item.quantity) || 0
    }))
  };

  data.unshift(newInventory);
  writeData(data);

  res.status(201).json(newInventory);
});

// PUT /api/inventories/:id - Inventur bearbeiten
app.put('/api/inventories/:id', (req, res) => {
  const { id } = req.params;
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Ungültige Artikel-Daten' });
  }

  const data = readData();
  const index = data.findIndex(inv => inv.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Inventur nicht gefunden' });
  }

  data[index].items = items.map(item => ({
    name: String(item.name || '').trim(),
    quantity: Number(item.quantity) || 0
  }));
  data[index].updatedAt = new Date().toISOString();

  writeData(data);
  res.json(data[index]);
});

if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`Kiosk-Server läuft auf Port ${PORT}`);
  });
}

module.exports = app;
