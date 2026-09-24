require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');

const inviteRoutes = require('./routes/invites');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
app.use(express.json());

// Blanket rate limit on anything touching auth/invites — slows down brute force
// on verification codes and invite-token guessing.
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.use('/api/invites', rateLimit({ windowMs: 15 * 60 * 1000, max: 60 }));

app.use('/api/invites', inviteRoutes);   // admin: create/list invites
app.use('/api/auth', authRoutes);        // signup-with-token, verify-email
app.use('/api/dashboard', dashboardRoutes); // gated behind requireAuth

app.listen(process.env.PORT || 3000, () =>
  console.log(`invite-portal-api listening on :${process.env.PORT || 3000}`)
);
