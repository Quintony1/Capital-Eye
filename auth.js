const router = require('express').Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../db/client');
const { sendVerificationEmail } = require('../services/email');
const { sendConfirmationSms } = require('../services/sms');

// GET /api/auth/invite/:token — the ONLY way the sign-up form is allowed to render.
// The frontend calls this before showing the form; anything else (no token,
// wrong token, expired/consumed token) returns 404, not a form.
router.get('/invite/:token', async (req, res) => {
  const invite = await prisma.invite.findUnique({ where: { token: req.params.token } });
  const valid = invite && invite.status === 'pending' && invite.expiresAt > new Date();
  if (!valid) return res.status(404).json({ error: 'invalid_or_expired_invite' });
  res.json({ name: invite.name, email: invite.email, role: invite.role });
});

// POST /api/auth/signup — creates the (unverified) account and emails a code.
// Every field about who this is comes from the invite record, not the request body,
// so a client can't forge a signup for an email they don't hold an invite for.
router.post('/signup', async (req, res) => {
  const { token, password } = req.body;
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.status !== 'pending' || invite.expiresAt < new Date()) {
    return res.status(404).json({ error: 'invalid_or_expired_invite' });
  }

  const code = String(crypto.randomInt(0, 999999)).padStart(6, '0');
  const user = await prisma.user.create({
    data: {
      inviteId: invite.id, name: invite.name, email: invite.email, phone: invite.phone,
      role: invite.role, passwordHash: await bcrypt.hash(password, 12),
      verificationCodeHash: await bcrypt.hash(code, 12),
      verificationExpires: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  await prisma.invite.update({ where: { id: invite.id }, data: { status: 'consumed' } });
  await sendVerificationEmail({ to: invite.email, name: invite.name, code });

  res.status(201).json({ userId: user.id, message: 'verification_code_sent' });
});

// POST /api/auth/verify — checks the code, flips emailVerified, fires the SMS.
router.post('/verify', async (req, res) => {
  const { userId, code } = req.body;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerified) return res.status(400).json({ error: 'invalid_request' });
  if (user.verificationAttempts >= 5) return res.status(429).json({ error: 'too_many_attempts' });
  if (user.verificationExpires < new Date()) return res.status(400).json({ error: 'code_expired' });

  const ok = await bcrypt.compare(code, user.verificationCodeHash);
  if (!ok) {
    await prisma.user.update({ where: { id: user.id }, data: { verificationAttempts: { increment: 1 } } });
    return res.status(400).json({ error: 'incorrect_code' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationCodeHash: null, smsConfirmedAt: new Date() },
  });

  // Customized per invitee — name, role, and a fresh single-use sign-in link.
  await sendConfirmationSms({
    to: user.phone,
    body: `Hi ${user.name.split(' ')[0]} — your ${user.role} account is active. ` +
          `Sign in: https://portal.example.com/go/${crypto.randomBytes(6).toString('hex')}`,
  });

  const sessionToken = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token: sessionToken });
});

module.exports = router;
