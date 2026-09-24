const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');

// Every dashboard route sits behind requireAuth, which itself re-checks
// emailVerified on every request — a valid JWT alone is not enough.
// This is the real gate; there is no client-side-only protection anywhere.
router.get('/', requireAuth, (req, res) => {
  res.json({ message: `Welcome, ${req.user.name}`, role: req.user.role });
});

module.exports = router;
