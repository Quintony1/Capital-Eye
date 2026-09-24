// Built lazily, not at require-time — if TWILIO_SID/TWILIO_AUTH_TOKEN aren't
// set yet, the app should still start; it should only fail when an SMS is
// actually attempted, not on boot.
let client;
function getClient() {
  if (!client) client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  return client;
}

exports.sendConfirmationSms = ({ to, body }) =>
  getClient().messages.create({ to, from: process.env.TWILIO_FROM_NUMBER, body });
