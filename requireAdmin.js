const jwt = require('jsonwebtoken');

// Same idea as requireAuth, scoped to staff accounts that manage invites.
// Wire this up to however you authenticate your own team (SSO, separate
// admin login, etc.) — invite issuance should never be reachable by
// an ordinary client/investor account.
module.exports = function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'no_session' });

  try {
    const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    if (payload.role !== 'admin') throw new Error('not admin');
    req.admin = payload;
    next();
  } catch {
    res.status(403).json({ error: 'admin_only' });
  }
};
