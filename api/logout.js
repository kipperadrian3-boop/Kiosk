// POST /api/logout  → löscht das Login-Cookie
const auth = require('./_auth');

module.exports = (req, res) => {
  res.setHeader('Set-Cookie', auth.cookieHeader('', 0));
  return auth.sendJson(res, 200, { ok: true });
};
