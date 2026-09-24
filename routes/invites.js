const router = require('express').Router();
const crypto = require('crypto');
const prisma = require('../db/client');
const requireAdmin = require('../middleware/requireAdmin');
const { sendInviteEmail } = require('../services/email');

const TOKEN_TTL_DAYS = 7;

async function issueInvite({ name, email, phone, role, source, invitedBy }) {
  const token = crypto.randomBytes(24).toString('base64url'); // ~32 chars, unguessable
  const invite = await prisma.invite.create({
    data: {
      name, email, phone, role, source, invitedBy, token,
      status: 'pending',
      expiresAt: new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  await sendInviteEmail({ to: email, name, token });
  return invite;
}

// 1) Manual entry — admin types a single person in.
router.post('/', requireAdmin, async (req, res) => {
  const { name, email, phone, role } = req.body;
  if (!name || !email || !phone || !role) return res.status(400).json({ error: 'missing fields' });
  const invite = await issueInvite({ name, email, phone, role, source: 'manual', invitedBy: req.admin.id });
  res.status(201).json(invite);
});

// 2) Bulk import — CSV rows: name,email,phone,role
router.post('/bulk', requireAdmin, async (req, res) => {
  const { rows } = req.body; // array of {name,email,phone,role}
  const results = [];
  for (const row of rows) {
    try {
      results.push(await issueInvite({ ...row, source: 'bulk_import', invitedBy: req.admin.id }));
    } catch (e) {
      results.push({ email: row.email, error: e.message });
    }
  }
  res.status(201).json(results);
});

// 3) Approve an applicant — turns an Application into an Invite.
router.post('/from-application/:appId', requireAdmin, async (req, res) => {
  const app = await prisma.application.findUnique({ where: { id: req.params.appId } });
  if (!app || app.status !== 'pending') return res.status(404).json({ error: 'not found' });

  const invite = await issueInvite({
    name: app.name, email: app.email, phone: app.phone,
    role: req.body.role || 'client', source: 'approved_application', invitedBy: req.admin.id,
  });
  await prisma.application.update({ where: { id: app.id }, data: { status: 'approved' } });
  res.status(201).json(invite);
});

router.get('/', requireAdmin, async (req, res) => {
  res.json(await prisma.invite.findMany({ orderBy: { createdAt: 'desc' } }));
});

module.exports = router;
