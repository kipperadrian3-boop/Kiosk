// Gemeinsame Passwort-Logik für die Server-Funktionen (Vercel).
// Dateien mit "_" am Anfang werden von Vercel nicht als eigene Route veröffentlicht.
//
// Das Passwort steht NICHT im Code (das Repo ist öffentlich), sondern nur in Vercel:
// Settings → Environment Variables → KIOSK_PASSWORD.
// Ist die Variable nicht gesetzt, kann sich niemand anmelden.
const crypto = require('crypto');

const COOKIE_NAME = 'kiosk_auth';
// 400 Tage = das Maximum, das Browser erlauben. Bei jeder Nutzung wird das
// Cookie erneuert (siehe check.js) – wer die Seite benutzt, bleibt also für immer angemeldet.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function configuredPassword() {
  return (process.env.KIOSK_PASSWORD || '').trim();
}

function isConfigured() {
  return configuredPassword().length > 0;
}

function expectedPasswordHash() {
  return sha256(configuredPassword());
}

function expectedSessionHash() {
  return sha256(sha256('kiosk-session-v1:' + configuredPassword()));
}

function isPasswordCorrect(password) {
  if (!isConfigured()) return false;
  return safeEqual(sha256(password), expectedPasswordHash());
}

function sessionTokenFor(password) {
  return sha256('kiosk-session-v1:' + password);
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

// Gibt das gültige Login-Token zurück (oder null)
function validToken(req) {
  const token = readCookie(req, COOKIE_NAME);
  if (!isConfigured()) return null;
  return token && safeEqual(sha256(token), expectedSessionHash()) ? token : null;
}

function isAuthenticated(req) {
  return !!validToken(req);
}

function cookieHeader(value, maxAge) {
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

async function readJsonBody(req) {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch { return {}; }
    }
    return req.body || {};
  }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

module.exports = {
  MAX_AGE_SECONDS,
  isConfigured,
  isPasswordCorrect,
  sessionTokenFor,
  validToken,
  isAuthenticated,
  cookieHeader,
  sendJson,
  readJsonBody
};
