import { feesService } from '../../services/feesService';
import { fmtDate as coreFmtDate } from '../../utils/date';

// Open a receipt for print. The /print endpoint is auth-gated, so a plain window.open(url)
// (no Authorization header) 401s — instead fetch the HTML via the authenticated client and
// write it into a new window. The window is opened synchronously on the click to dodge popup blockers.
export async function openReceipt(id, format) {
  const w = window.open('', '_blank');
  try {
    const html = await feesService.getReceiptHtml(id, format);
    if (w) { w.document.open(); w.document.write(html); w.document.close(); }
    return true;
  } catch (e) {
    if (w) w.close();
    return false;
  }
}

// Shared UI helpers + tokens for the Fees screens (mirrors the approved mockup).
export const FEE_COLORS = {
  primary: '#3366ff',
  primaryLight: '#598bff',
  success: '#00b887',
  danger: '#ff3d71',
  warning: '#f5a623',
  muted: '#8f9bb3',
  border: '#e4e9f2',
};

// ₹ with Indian digit grouping, no decimals for whole rupees.
export function inr(v) {
  const n = Number(v || 0);
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: n % 1 === 0 ? 0 : 2 });
}

// Compact ₹ (lakh / crore) for KPI headline numbers.
export function inrShort(v) {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1e7) return '₹' + (n / 1e7).toFixed(2).replace(/\.00$/, '') + 'cr';
  if (Math.abs(n) >= 1e5) return '₹' + (n / 1e5).toFixed(2).replace(/\.00$/, '') + 'L';
  return inr(n);
}

// Server error → readable string (core-api shape: error.description).
export function errMsg(err, fallback = 'Something went wrong') {
  return err?.response?.data?.error?.description || err?.message || fallback;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// On-screen dates use the portal-wide canonical format (dd-mm-yyyy); keep the '—' empty fallback.
export function fmtDate(v) {
  return v ? coreFmtDate(v) : '—';
}
// For <input type="date"> which needs YYYY-MM-DD.
export function toDateInput(v) {
  if (!v) return '';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

// Sortable rank for a class name like "III-A" (NURSERY→…→XII, then section). No class → end.
const GRADE_ORDER = ['NURSERY', 'LKG', 'UKG', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export function classRank(className) {
  if (!className) return 100000;
  const [grade, section = ''] = String(className).split('-');
  const gi = GRADE_ORDER.indexOf(grade.toUpperCase().trim());
  return (gi === -1 ? 900 : gi) * 100 + (section.toUpperCase().charCodeAt(0) || 0);
}

export const PAYMENT_MODE_LABELS = {
  cash: 'Cash',
  cheque: 'Cheque',
  draft: 'DD / Draft',
  ecs: 'ECS',
  'bank-deposit': 'Bank Deposit',
  card: 'Card',
  neft: 'NEFT',
  online: 'Online / NEFT',
  rte: 'RTE',
};

export const CONCESSION_TYPE_LABELS = {
  sibling: 'Sibling',
  sibling_elder: 'Sibling — Elder',
  sibling_younger: 'Sibling — Younger',
  staff: 'Staff',
  ews: 'EWS',
  other: 'Other',
};
