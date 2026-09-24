const jwt = require('jsonwebtoken');
const prisma = require('../db/client');

module.exports = async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'no_session' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'invalid_session' });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  // Re-check verified status server-side on every request, not just at login —
  // covers accounts revoked or rolled back after the token was issued.
  if (!user || !user.emailVerified) return res.status(403).json({ error: 'not_verified' });

  req.user = user;
  next();
};
