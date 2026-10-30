const { put, list } = require('@vercel/blob');

const BLOB_FILENAME = 'inventory.json';

async function getInventories() {
  try {
    const { blobs } = await list();
    const found = blobs.find(b => b.pathname === BLOB_FILENAME);
    if (found) {
      const res = await fetch(found.url, { cache: 'no-store' });
      if (res.ok) {
        return await res.json();
      }
    }
  } catch (err) {
    console.error('Blob get error:', err);
  }
  return [];
}

async function saveInventories(data) {
  await put(BLOB_FILENAME, JSON.stringify(data, null, 2), {
    access: 'public',
    addRandomSuffix: false
  });
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const id = req.query.id;

    if (req.method === 'GET') {
      const data = await getInventories();
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { items } = req.body || {};
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Keine Artikel angegeben' });
      }

      const data = await getInventories();
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
      await saveInventories(data);
      return res.status(201).json(newInventory);
    }

    if (req.method === 'PUT') {
      const { items } = req.body || {};
      if (!id || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Ungültige Daten oder fehlende ID' });
      }

      const data = await getInventories();
      const index = data.findIndex(inv => inv.id === id);
      if (index === -1) {
        return res.status(404).json({ error: 'Inventur nicht gefunden' });
      }

      data[index].items = items.map(item => ({
        name: String(item.name || '').trim(),
        quantity: Number(item.quantity) || 0
      }));
      data[index].updatedAt = new Date().toISOString();

      await saveInventories(data);
      return res.status(200).json(data[index]);
    }

    if (req.method === 'DELETE') {
      if (!id) {
        return res.status(400).json({ error: 'Fehlende ID' });
      }

      const data = await getInventories();
      const index = data.findIndex(inv => inv.id === id);
      if (index === -1) {
        return res.status(404).json({ error: 'Inventur nicht gefunden' });
      }

      const deleted = data.splice(index, 1);
      await saveInventories(data);
      return res.status(200).json({ success: true, deleted: deleted[0] });
    }

    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  } catch (error) {
    console.error('Serverless Handler Fehler:', error);
    return res.status(500).json({ error: error.message });
  }
};
