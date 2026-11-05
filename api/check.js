// GET /api/check  → 200 wenn eingeloggt, sonst 401
// Bei Erfolg wird das Login-Cookie erneuert, damit das Gerät dauerhaft angemeldet bleibt.
const auth = require('./_auth');

module.exports = (req, res) => {
  const token = auth.validToken(req);
  if (token) {
    res.setHeader('Set-Cookie', auth.cookieHeader(token, auth.MAX_AGE_SECONDS));
    return auth.sendJson(res, 200, { ok: true });
  }
  return auth.sendJson(res, 401, { ok: false });
};
