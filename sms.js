const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

exports.sendConfirmationSms = ({ to, body }) =>
  twilio.messages.create({ to, from: process.env.TWILIO_FROM_NUMBER, body });
