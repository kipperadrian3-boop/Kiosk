// POST /api/login  { password }  → setzt bei richtigem Passwort ein Login-Cookie
const auth = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return auth.sendJson(res, 405, { ok: false });
  }

  const body = await auth.readJsonBody(req);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!auth.isPasswordCorrect(password)) {
    // Kurz warten, damit massenhaftes Durchprobieren langsamer wird
    await new Promise((r) => setTimeout(r, 800));
    return auth.sendJson(res, 401, { ok: false, error: 'Falsches Passwort' });
  }

  res.setHeader('Set-Cookie', auth.cookieHeader(auth.sessionTokenFor(password), auth.MAX_AGE_SECONDS));
  return auth.sendJson(res, 200, { ok: true });
};
