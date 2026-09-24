// Uses Resend (https://resend.com). SendGrid works the same way — swap the
// fetch call for their /v3/mail/send endpoint if that's your provider.
const RESEND_API = 'https://api.resend.com/emails';

async function send({ to, subject, html }) {
  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html }),
  });
  if (!res.ok) throw new Error(`email_send_failed: ${await res.text()}`);
}

exports.sendInviteEmail = ({ to, name, token }) => send({
  to,
  subject: "You're invited",
  html: `<p>Hi ${name},</p><p>You've been invited to the portal. This link is unique to you and expires in 7 days.</p>
         <p><a href="${process.env.APP_URL}/signup?invite=${token}">Set up your account</a></p>`,
});

exports.sendVerificationEmail = ({ to, name, code }) => send({
  to,
  subject: 'Your verification code',
  html: `<p>Hi ${name},</p><p>Your verification code is <b>${code}</b>. It expires in 10 minutes.</p>`,
});
