/**
 * Gmail Send Service
 * 
 * Sends emails using the authenticated user's Gmail account.
 * Requires: gmail.send OAuth scope
 * 
 * ARCHITECTURE NOTES:
 * - The Gmail API expects a base64url-encoded RFC 2822 message
 * - We construct the raw email string, encode it, and POST to Gmail
 * - The "from" address is always the authenticated user (Google enforces this)
 * - The "to" address is also the user — they email THEMSELVES
 * 
 * WHY THIS APPROACH:
 * - No backend needed
 * - No third-party email service
 * - No API keys exposed in client code
 * - User's own Gmail sends it — deliverability is guaranteed
 * - gmail.send scope cannot read inbox — privacy preserved
 */

// Convert string to base64url (Gmail API requirement)
function base64url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Build RFC 2822 email with HTML body
function buildMimeMessage({ to, subject, htmlBody }) {
  const boundary = "boundary_" + Date.now();
  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlBody,
    `--${boundary}--`
  ];
  return lines.join("\r\n");
}

// Build RFC 2822 email with HTML body + CSV attachment
function buildMimeMessageWithAttachment({ to, subject, htmlBody, csvContent, csvFilename }) {
  const boundary = "boundary_" + Date.now();
  const csvBase64 = btoa(unescape(encodeURIComponent(csvContent)));
  
  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlBody,
    ``,
    `--${boundary}`,
    `Content-Type: text/csv; name="${csvFilename}"`,
    `Content-Disposition: attachment; filename="${csvFilename}"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    csvBase64,
    ``,
    `--${boundary}--`
  ];
  return lines.join("\r\n");
}

// Send email via Gmail API
export async function sendEmail(token, { to, subject, htmlBody, csvContent, csvFilename }) {
  let rawMessage;
  
  if (csvContent && csvFilename) {
    rawMessage = buildMimeMessageWithAttachment({ to, subject, htmlBody, csvContent, csvFilename });
  } else {
    rawMessage = buildMimeMessage({ to, subject, htmlBody });
  }

  const encoded = base64url(rawMessage);

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw: encoded })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gmail API error ${res.status}: ${err.error?.message || "Unknown"}`);
  }

  return await res.json();
}
