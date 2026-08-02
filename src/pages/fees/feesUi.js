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
