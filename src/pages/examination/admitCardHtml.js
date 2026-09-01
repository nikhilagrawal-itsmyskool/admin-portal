// Build a self-contained HTML document for printing admit cards (N-up on A4). Everything
// is inlined (logo/stamp/QR are data: URIs), so it prints reliably from a hidden iframe
// with no dependency on the app's stylesheet or a print-media visibility trick.

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmt(d) {
  if (!d) return '';
  const [y, m, day] = String(d).split('-');
  return `${day}-${MON[Number(m) - 1] || m}-${y}`;
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function buildAdmitCardsHtml(data, cardsPerPage) {
  const per = cardsPerPage === 3 ? 3 : 4;
  const cols = per === 4 ? 2 : 1;
  const { exam, section, branding, papers, cards } = data;
  const schoolName = (branding && branding.schoolName) || 'Dr. B. P. Agrawal Shiksha Niketan';
  const motto = (branding && branding.motto) || 'Chariot of Knowledge';

  const pages = [];
  for (let i = 0; i < cards.length; i += per) pages.push(cards.slice(i, i + per));

  const headCols = papers.map((p) => `<th>${esc(fmt(p.examDate))}</th>`).join('');
  const subjCols = papers.map((p) => `<td>${esc(p.subjectLabel)}</td>`).join('');

  // Invigilator-sign row is per-student: a digitally-signed day shows the signature image
  // (present) or "ABSENT"; unsigned days stay blank for a wet-ink signature.
  const signCell = (p, c) => {
    const sig = c.signatures ? c.signatures[p.examDate] : null;
    if (sig && sig.signed) {
      if (sig.status === 'present' && sig.signatureDataUri) return `<td><img class="sig" src="${sig.signatureDataUri}"></td>`;
      if (sig.status === 'absent') return '<td class="absent">ABSENT</td>';
    }
    return '<td></td>';
  };

  const card = (c) => `
    <div class="card">
      <div class="head">
        ${branding && branding.logoDataUri ? `<img class="logo" src="${branding.logoDataUri}">` : '<div class="logo"></div>'}
        <div class="htext">
          <div class="school">${esc(schoolName)}</div>
          <div class="tag">— ${esc(motto)} —</div>
          <div class="exam">${esc(exam.name)} · ${esc(exam.academicYearName)}</div>
        </div>
        ${c.qrDataUri ? `<img class="qr" src="${c.qrDataUri}">` : '<div class="qr"></div>'}
      </div>
      <div class="title">ADMIT CARD</div>
      <div class="meta"><span><b>Name:</b> ${esc(c.name)}</span><span><b>Class:</b> ${esc(section.name)}</span></div>
      <div class="meta"><span><b>Roll No:</b> <span class="line"></span></span></div>
      <table>
        <tr><td class="rl">Date</td>${headCols}</tr>
        <tr><td class="rl">Subject</td>${subjCols}</tr>
        <tr class="sign"><td class="rl">Invigilator sign</td>${papers.map((p) => signCell(p, c)).join('')}</tr>
      </table>
      <div class="foot">
        <span>Examination Incharge</span>
        <span class="stamp">${branding && branding.stampDataUri ? `<img src="${branding.stampDataUri}">` : ''}<div>Office sign &amp; Stamp</div></span>
      </div>
    </div>`;

  const body = pages.map((pg) => `<div class="page"><div class="grid">${pg.map(card).join('')}</div></div>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Admit Cards</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Times New Roman', serif; color: #000; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 6mm; }
    .card { border: 1px solid #000; border-radius: 4px; padding: 6px 8px; break-inside: avoid;
            display: flex; flex-direction: column; min-height: ${per === 4 ? '128mm' : '86mm'}; }
    .head { display: flex; align-items: center; gap: 8px; }
    .logo { width: 42px; height: 42px; object-fit: contain; }
    .htext { flex: 1; text-align: center; line-height: 1.15; }
    .school { font-size: 15px; font-weight: 700; }
    .tag { font-size: 10px; }
    .exam { font-size: 11px; font-weight: 600; }
    /* Measured: at 82px this printed ~13mm → 0.52mm/module, below the camera's ~0.6mm limit, so it
       wouldn't scan. Enlarge so each module is ≥0.6mm even after the card's print-scaling. White
       quiet-zone around it; keep modules crisp. */
    .qr { width: 128px; height: 128px; background: #fff; padding: 6px; image-rendering: pixelated; flex: none; }
    .title { text-align: center; font-weight: 700; text-decoration: underline; font-size: 12px; margin: 3px 0; letter-spacing: 1px; }
    .meta { display: flex; justify-content: space-between; font-size: 12px; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11px; }
    th, td { border: 1px solid #000; padding: 2px 3px; text-align: center; height: 16px; }
    td.rl { font-weight: 700; text-align: left; white-space: nowrap; width: 64px; }
    tr.sign td { height: 30px; }
    tr.sign img.sig { max-height: 26px; max-width: 96%; object-fit: contain; }
    td.absent { font-size: 9px; font-weight: 700; letter-spacing: 0.5px; }
    .foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; padding-top: 8px; font-size: 11px; }
    .stamp { text-align: center; }
    .stamp img { max-width: 90px; max-height: 46px; object-fit: contain; display: block; margin: 0 auto; }
    .line { display: inline-block; min-width: 90px; border-bottom: 1px dotted #000; }
  </style></head><body>${body}</body></html>`;
}
