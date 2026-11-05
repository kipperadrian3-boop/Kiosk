// GET /api/check  → 200 wenn eingeloggt, sonst 401
const auth = require('./_auth');

module.exports = (req, res) => {
  if (auth.isAuthenticated(req)) return auth.sendJson(res, 200, { ok: true });
  return auth.sendJson(res, 401, { ok: false });
};
