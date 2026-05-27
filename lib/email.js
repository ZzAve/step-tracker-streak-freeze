'use strict';

const logger = require('./logger');

async function sendPasswordResetEmail(email, token) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn('RESEND_API_KEY not set, skipping password reset email');
    return;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password.html?token=${token}`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@steptracker.app',
      to: email,
      subject: 'Wachtwoord opnieuw instellen - Stappen Streak',
      html: `
        <p>Hallo,</p>
        <p>We hebben een verzoek ontvangen om je wachtwoord opnieuw in te stellen.</p>
        <p><a href="${resetUrl}">Klik hier om je wachtwoord opnieuw in te stellen</a></p>
        <p>Deze link is 1 uur geldig.</p>
        <p>Als je dit niet hebt aangevraagd, kun je deze e-mail negeren.</p>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error: ${response.status} ${body}`);
  }
}

module.exports = { sendPasswordResetEmail };
