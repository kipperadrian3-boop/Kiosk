// Gemeinsame Passwort-Logik für die Server-Funktionen (Vercel).
// Dateien mit "_" am Anfang werden von Vercel nicht als eigene Route veröffentlicht.
//
// Das Passwort steht hier NICHT im Klartext, nur als SHA-256-Prüfwert.
// Wer ein anderes Passwort will: in Vercel unter Settings → Environment Variables
// die Variable KIOSK_PASSWORD setzen – dann gilt diese statt des Standards.
const crypto = require('crypto');

const DEFAULT_PASSWORD_HASH = 'd582220938ba7b624b67194568cc1deb96d5d993c7238ac19ea3e685c899d9f4';
const DEFAULT_SESSION_HASH = 'd6f9a8ee28675ce03e582edbee3754f0d03007cab3cc303e8c08bfdc7b90fdef';
const COOKIE_NAME = 'kiosk_auth';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 Tage eingeloggt bleiben

function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function expectedPasswordHash() {
  return process.env.KIOSK_PASSWORD ? sha256(process.env.KIOSK_PASSWORD) : DEFAULT_PASSWORD_HASH;
}

function expectedSessionHash() {
  return process.env.KIOSK_PASSWORD
    ? sha256(sha256('kiosk-session-v1:' + process.env.KIOSK_PASSWORD))
    : DEFAULT_SESSION_HASH;
}

function isPasswordCorrect(password) {
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

function isAuthenticated(req) {
  const token = readCookie(req, COOKIE_NAME);
  return !!token && safeEqual(sha256(token), expectedSessionHash());
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
  isPasswordCorrect,
  sessionTokenFor,
  isAuthenticated,
  cookieHeader,
  sendJson,
  readJsonBody
};
