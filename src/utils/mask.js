// Partial redaction helpers for sensitive contact fields. Used to hide parent/
// guardian phone, WhatsApp and email from users who lack `student.contacts.view`.
// These are UI-only — the backend still returns full values today.

const DOT = '•'; // •

// Keep the first 2 and last 2 visible: "9810054521" -> "98••••••21".
// Short values (<= 4 chars) are fully masked.
export function maskPhone(value) {
  if (!value) return value || '';
  const v = String(value).trim();
  if (v.length <= 4) return DOT.repeat(v.length);
  const first = v.slice(0, 2);
  const last = v.slice(-2);
  return `${first}${DOT.repeat(v.length - 4)}${last}`;
}

// Keep the first local char + domain: "raj@gmail.com" -> "r••@gmail.com".
export function maskEmail(value) {
  if (!value) return value || '';
  const v = String(value).trim();
  const at = v.indexOf('@');
  if (at <= 0) return maskPhone(v); // not a normal email — fall back to generic mask
  const local = v.slice(0, at);
  const domain = v.slice(at); // includes '@'
  const head = local.slice(0, 1);
  return `${head}${DOT.repeat(2)}${domain}`;
}

// Convenience: mask a contact value by kind ('phone' | 'email') unless `reveal`.
export function maskContact(value, kind, reveal) {
  if (reveal) return value || '';
  return kind === 'email' ? maskEmail(value) : maskPhone(value);
}
