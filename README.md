# Invite-only portal — API scaffold

Matches the prototype: no public sign-up, email verification, then a
customized SMS the moment an account goes live.

## Setup

```
npm install express bcrypt jsonwebtoken dotenv express-rate-limit twilio @prisma/client
npx prisma generate
```

## Environment variables (.env)

```
DATABASE_URL=postgres://...
JWT_SECRET=long-random-string
ADMIN_JWT_SECRET=different-long-random-string
APP_URL=https://portal.example.com

RESEND_API_KEY=...
EMAIL_FROM=invitations@yourdomain.com

TWILIO_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
```

## Providers

- **Email — Resend** (or SendGrid): both have a free tier, good deliverability,
  and a one-call send API. `services/email.js` is written for Resend; the
  SendGrid swap is a couple of lines.
- **SMS — Twilio**: the standard here; also supports WhatsApp if you'd rather
  message investors there instead of SMS.

## The three intake paths, all landing in the same `issueInvite()`

- `POST /api/invites` — admin types someone in directly.
- `POST /api/invites/bulk` — paste/import a CSV of name,email,phone,role.
- `POST /api/invites/from-application/:appId` — promote a pending
  `Application` (from a "request access" form) into a real invite.

Every path ends the same way: a random single-use token, a 7-day expiry,
and an email — never a shared or guessable link.

## Where the actual gate lives

Not in the frontend. `GET /api/auth/invite/:token` is the only thing that
can make the sign-up form appear, and `requireAuth` re-checks
`emailVerified` server-side on **every** dashboard request — so even a
leaked or forged session can't reach the dashboard for an unverified or
revoked account.
