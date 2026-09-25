// Build a self-contained printable HTML document (and CSV) for a student roster
// report. Everything is inlined (logo is a data: URI) so it prints reliably from a
// hidden iframe, independent of the app stylesheet. Mirrors the admit-card approach.

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = String(d).split('T')[0].split('-');
  if (!day) return String(d);
  return `${day}-${MON[Number(m) - 1] || m}-${y}`;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Display formatting per field key (shared by print + CSV so both agree).
export function formatValue(key, val) {
  // Boolean flags default to No — an unset (null) rte/examOnly means "No", not blank.
  if (key === 'rte' || key === 'examOnly') return val === true ? 'Yes' : 'No';
  if (val == null || val === '') return '';
  if (key === 'dob' || key === 'admissionDate') return fmtDate(val);
  return String(val);
}

// Group rows by classId, preserving first-seen order (rows arrive class-ordered).
function groupByClass(rows) {
  const groups = [];
  const idx = {};
  for (const r of rows) {
    let i = idx[r.classId];
    if (i === undefined) {
      i = groups.length;
      idx[r.classId] = i;
      groups.push({ classId: r.classId, className: r.className, rows: [] });
    }
    groups[i].rows.push(r);
  }
  return groups;
}

// opts: { orientation: 'portrait'|'landscape', pageBreakPerClass, title, subtitle }
// fields: [{ key, label }] in display order. branding: { logoDataUri, schoolName, motto, address }.
export function buildReportHtml({ branding, rows, fields, title, subtitle }, opts = {}) {
  const orientation = opts.orientation === 'landscape' ? 'landscape' : 'portrait';
  const pageBreak = !!opts.pageBreakPerClass;
  const schoolName = (branding && branding.schoolName) || 'Dr. B. P. Agrawal Shiksha Niketan';
  const motto = (branding && branding.motto) || '';
  const address = (branding && branding.address) || '';
  const logo = branding && branding.logoDataUri;

  const header = `
    <div class="head">
      ${logo ? `<img class="logo" src="${logo}">` : '<div class="logo"></div>'}
      <div class="htext">
        <div class="school">${esc(schoolName)}</div>
        ${motto ? `<div class="tag">— ${esc(motto)} —</div>` : ''}
        ${address ? `<div class="addr">${esc(address)}</div>` : ''}
      </div>
    </div>
    <div class="rtitle">${esc(title || 'Student Report')}</div>
    ${subtitle ? `<div class="rsub">${esc(subtitle)}</div>` : ''}`;

  const headRow = `<tr><th class="sn">#</th>${fields.map((f) => `<th>${esc(f.label)}</th>`).join('')}</tr>`;

  const bodyRows = (list) =>
    list
      .map(
        (r, i) =>
          `<tr><td class="sn">${i + 1}</td>${fields
            .map((f) => `<td>${esc(formatValue(f.key, r[f.key]))}</td>`)
            .join('')}</tr>`
      )
      .join('');

  const tableFor = (list) => `<table><thead>${headRow}</thead><tbody>${bodyRows(list)}</tbody></table>`;

  let body;
  if (pageBreak) {
    body = groupByClass(rows)
      .map(
        (g) =>
          `<section class="cls"><div class="clsname">${esc(g.className)} · ${g.rows.length} student${
            g.rows.length === 1 ? '' : 's'
          }</div>${tableFor(g.rows)}</section>`
      )
      .join('');
  } else {
    body = tableFor(rows);
  }

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title || 'Student Report')}</title>
  <style>
    @page { size: A4 ${orientation}; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #000; font-size: 11px; }
    .head { display: flex; align-items: center; gap: 10px; border-bottom: 2px solid #000; padding-bottom: 6px; }
    .logo { width: 46px; height: 46px; object-fit: contain; flex: none; }
    .htext { flex: 1; text-align: center; line-height: 1.2; }
    .school { font-size: 17px; font-weight: 700; }
    .tag { font-size: 11px; font-style: italic; }
    .addr { font-size: 10px; color: #333; }
    .rtitle { text-align: center; font-weight: 700; font-size: 13px; margin: 8px 0 2px; text-transform: uppercase; letter-spacing: 0.5px; }
    .rsub { text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }
    .cls { margin-bottom: 10px; page-break-after: always; }
    .cls:last-child { page-break-after: auto; }
    .clsname { font-weight: 700; font-size: 12px; margin: 10px 0 4px; padding: 3px 6px; background: #eee; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    thead { display: table-header-group; }
    th, td { border: 1px solid #666; padding: 3px 5px; text-align: left; vertical-align: top; }
    th { background: #f0f0f0; font-weight: 700; font-size: 10px; white-space: nowrap; }
    td.sn, th.sn { width: 28px; text-align: center; }
    tr { break-inside: avoid; }
  </style></head><body>${header}${body}</body></html>`;
}

// Build a CSV string. fields: [{ key, label }]. Adds a leading serial column.
export function buildReportCsv(rows, fields) {
  const cell = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['S.No', ...fields.map((f) => f.label)].map(cell).join(',');
  const lines = rows.map((r, i) =>
    [i + 1, ...fields.map((f) => formatValue(f.key, r[f.key]))].map(cell).join(',')
  );
  return [header, ...lines].join('\r\n');
}

// Trigger a client-side file download for a text blob.
export function downloadText(filename, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Write HTML into a hidden iframe and print it (mirrors AdmitCardsTab.startPrint).
export function printHtml(html) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  const cleanup = () => setTimeout(() => iframe.remove(), 1000);
  win.onafterprint = cleanup;
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
  }, 350);
  setTimeout(cleanup, 60000);
}
