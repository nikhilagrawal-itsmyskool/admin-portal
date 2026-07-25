// Partial redaction helpers for sensitive contact fields. Hide parent/guardian/
// employee/driver phone, WhatsApp and email from users who lack `student.contacts.view`
// (admin/god only). The backend now masks these too for non-admin/god callers, so this
// is a defense-in-depth / consistent-format layer, not the sole gate.

const DOT = '•'; // •

// Keep only the last 2 visible: "9810054521" -> "••••••••21" (matches the backend
// maskPhone). Short values (<= 2 chars) are fully masked to a minimum of 4 dots.
export function maskPhone(value) {
  if (!value) return value || '';
  const v = String(value).trim();
  if (v.length <= 2) return DOT.repeat(Math.max(v.length, 4));
  return `${DOT.repeat(v.length - 2)}${v.slice(-2)}`;
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
