const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { put, list } = require('@vercel/blob');

const app = express();
const PORT = process.env.PORT || 3000;

const IS_VERCEL = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
const DATA_FILE = IS_VERCEL
  ? path.join('/tmp', 'inventory.json')
  : path.join(__dirname, 'data', 'inventory.json');

const INITIAL_FILE = path.join(__dirname, 'data', 'inventory.json');
const BLOB_FILENAME = 'inventory.json';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

let memoryStore = null;

// Aus Vercel Blob oder lokal lesen
async function readData() {
  // Wenn Blob Storage Token verfügbar ist
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({ prefix: BLOB_FILENAME });
      const found = blobs.find(b => b.pathname === BLOB_FILENAME);
      if (found) {
        const response = await fetch(found.url, { cache: 'no-store' });
        if (response.ok) {
          const json = await response.json();
          memoryStore = json;
          return memoryStore;
        }
      }
    } catch (err) {
      console.warn('Vercel Blob Ladefehler, falle zurück:', err);
    }
  }

  // Fallback: Memory
  if (memoryStore !== null) {
    return memoryStore;
  }

  // Fallback: Datei
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
    console.error('Fehler beim Dateilesen:', err);
  }

  memoryStore = [];
  return memoryStore;
}

// In Vercel Blob und lokal speichern
async function writeData(data) {
  memoryStore = data;

  // Wenn Vercel Blob Token vorhanden ist
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await put(BLOB_FILENAME, JSON.stringify(data, null, 2), {
        access: 'public',
        addRandomSuffix: false
      });
    } catch (err) {
      console.error('Fehler beim Speichern in Vercel Blob:', err);
    }
  }

  // Lokale Kopie
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Read-only filesystem warning
  }
}

// GET /api/inventories
app.get('/api/inventories', async (req, res) => {
  const data = await readData();
  const sorted = [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

// POST /api/inventories
app.post('/api/inventories', async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Keine Artikel angegeben' });
  }

  const data = await readData();
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
  await writeData(data);

  res.status(201).json(newInventory);
});

// PUT /api/inventories/:id
app.put('/api/inventories/:id', async (req, res) => {
  const { id } = req.params;
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Ungültige Artikel-Daten' });
  }

  const data = await readData();
  const index = data.findIndex(inv => inv.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Inventur nicht gefunden' });
  }

  data[index].items = items.map(item => ({
    name: String(item.name || '').trim(),
    quantity: Number(item.quantity) || 0
  }));
  data[index].updatedAt = new Date().toISOString();

  await writeData(data);
  res.json(data[index]);
});

// DELETE /api/inventories/:id
app.delete('/api/inventories/:id', async (req, res) => {
  const { id } = req.params;
  const data = await readData();
  const index = data.findIndex(inv => inv.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Inventur nicht gefunden' });
  }

  const deleted = data.splice(index, 1);
  await writeData(data);
  res.json({ success: true, deleted: deleted[0] });
});

if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`Kiosk-Server läuft auf Port ${PORT}`);
  });
}

module.exports = app;
