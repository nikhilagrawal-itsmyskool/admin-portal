// Report-card HTML — one scheme-driven template for all four bands (1-3, 4-5, 6-9, and the
// pre-primary "Progress Report"), matching the school's existing printed format. Data comes from
// GET /report/cards/{classId}/{term}; everything is inlined (logos + photos are data URIs) and
// printed via a hidden iframe (house pattern → Save as PDF). Photos are fetched + resized at print
// time by the caller (ReportCards.jsx) and set on student.photoDataUri.

const esc = (v) => (v == null ? '' : String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
// A cell value that may be the Absent sentinel — Absent prints as a red-circled A.
const cell = (v) => (v === 'ABSENT' ? '<span class="abs">A</span>' : esc(v));
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const attendance = (s) => (s.attendancePresent != null && s.attendanceTotal != null ? `${s.attendancePresent}/${s.attendanceTotal}` : '');

function masthead(b) {
  // Left = board/affiliating-body emblem (falls back to the school crest until uploaded);
  // right = school crest. Affiliation No. sits under the left crest, School Code under the right.
  const boardLogo = b.boardLogoDataUri || b.logoDataUri;
  const schoolLogo = b.logoDataUri || b.boardLogoDataUri;
  const crest = (uri) => `<div class="crest">${uri ? `<img src="${uri}" alt="">` : ''}</div>`;
  const cap = (label, val) => (val ? `<div class="crest-cap"><span>${esc(label)}</span>${esc(val)}</div>` : '');
  const line = [b.email ? `E - mail : ${esc(b.email)}` : '', b.website ? `website : ${esc(b.website)}` : ''].filter(Boolean).join('&nbsp;&nbsp;★&nbsp;&nbsp;');
  return `<div class="mast">
    <div class="crest-col">${crest(boardLogo)}${cap('Affiliation No. :', b.affiliationNo)}</div>
    <div class="mast-mid">
      <div class="sname">${esc(b.schoolName || 'Report Card')}</div>
      ${b.motto ? `<div class="motto">${esc(b.motto)}</div>` : ''}
      ${b.address ? `<div class="addr">${esc(b.address)}</div>` : ''}
      ${b.contact ? `<div class="addr">Contact No. : ${esc(b.contact)}</div>` : ''}
      ${line ? `<div class="addr">${line}</div>` : ''}
    </div>
    <div class="crest-col">${crest(schoolLogo)}${cap('School Code :', b.schoolCode)}</div>
  </div>`;
}

function infoGrid(data, s, withPhoto) {
  const rows = [
    ['Name', s.name, 'Class', data.className],
    ["Father's Name", s.fatherName, "Mother's Name", s.motherName],
    ['Roll No', s.rollNumber, 'D.O.B', s.dob],
    ['Admission No', s.admissionNumber, 'Attendance', attendance(s)],
    ['House', s.house, '', ''],
  ];
  const cells = rows.map((r) => `<tr>
    <td class="k">${esc(r[0])}</td><td class="v">${esc(r[1])}</td>
    <td class="k">${esc(r[2])}</td><td class="v">${esc(r[3])}</td></tr>`).join('');
  return `<div class="info-wrap">
    <table class="info">${cells}</table>
    ${withPhoto ? `<div class="photo">${s.photoDataUri ? `<img src="${s.photoDataUri}" alt="">` : ''}</div>` : ''}
  </div>`;
}

function scholasticTable(data) {
  const comps = data.scheme.components;
  const termLabel = data.term === 2 ? 'TERM 2' : 'TERM 1';
  const head = `<tr>
    <th class="subj">SUBJECTS</th>
    ${comps.map((c) => `<th>${esc(c.label)}<div class="mx">(${esc(c.max)})</div></th>`).join('')}
    <th>TOTAL</th><th>GRADE</th></tr>`;
  return (s) => {
    const body = data.scheme.subjects.map((subj) => {
      const t = s.subjectTotals[subj.code] || {};
      const m = s.marks[subj.code] || {};
      return `<tr>
        <td class="subj">${esc(subj.label)}</td>
        ${comps.map((c) => `<td>${m[c.code] == null ? '' : cell(m[c.code])}</td>`).join('')}
        <td class="tot">${t.total == null ? '' : `${esc(t.total)}/${esc(t.max)}`}</td>
        <td class="grd">${esc(t.grade)}</td></tr>`;
    }).join('');
    const foot = `<div class="totals">TOTAL MARKS: ${s.overall.total == null ? '' : `${esc(s.overall.total)}/${esc(s.overall.max)}`} &nbsp;&nbsp; PERCENTAGE: ${s.overall.percentage == null ? '' : `${esc(s.overall.percentage)}%`}</div>`;
    return `<table class="marks"><thead><tr><th colspan="${comps.length + 3}" class="term-h">${termLabel}</th></tr>${head}</thead><tbody>${body}</tbody></table>${foot}`;
  };
}

function areaSections(data, s) {
  const sections = [];
  const map = {};
  data.scheme.areas.forEach((a) => { (map[a.section] = map[a.section] || []).push(a); });
  Object.keys(map).forEach((section) => {
    const rows = map[section].map((a) => {
      const v = s.areaGrades[a.id];
      return `<tr><td class="k">${esc(a.label)}</td><td class="g">${cell(v)}</td></tr>`;
    }).join('');
    sections.push(`<div class="area-block"><table class="area"><thead><tr><th class="k">${esc(section)}</th><th class="g">${data.term === 2 ? 'TERM 2' : 'TERM 1'}</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  });
  return `<div class="areas">${sections.join('')}</div>`;
}

function legends(data) {
  const sch = data.scheme.scholasticScale || [];
  const co = data.scheme.coscholasticScale || [];
  const schL = sch.length ? `<div class="leg">
    <div class="leg-t">Grading scale for Scholastic Areas</div>
    <table class="leg-tbl"><tr>${sch.map((g) => `<td class="lg">${esc(g.grade)}</td>`).join('')}</tr>
    <tr>${sch.map((g) => `<td>${esc(g.label)}</td>`).join('')}</tr>
    <tr>${sch.map((g) => `<td>${g.minPct != null ? `${esc(g.minPct)}-${esc(g.maxPct)}` : ''}</td>`).join('')}</tr></table></div>` : '';
  const coHasPct = co.some((g) => g.minPct != null);
  const coL = co.length ? `<div class="leg">
    <div class="leg-t">Grading scale for Co-Scholastic Areas</div>
    <table class="leg-tbl"><tr>${co.map((g) => `<td class="lg">${esc(g.grade)}</td>`).join('')}</tr>
    <tr>${co.map((g) => `<td>${esc(g.label)}</td>`).join('')}</tr>
    ${coHasPct ? `<tr>${co.map((g) => `<td>${g.minPct != null ? `${esc(g.minPct)}-${esc(g.maxPct)}` : ''}</td>`).join('')}</tr>` : ''}</table></div>` : '';
  return `<div class="legends">${schL}${coL}</div>`;
}

function card(data, s) {
  const isPre = data.band === 'pre-primary';
  const title = isPre ? 'PROGRESS REPORT' : 'ACHIEVEMENT RECORD';
  const marksTbl = data.scheme.components.length ? scholasticTable(data)(s) : '';
  const sigs = isPre
    ? ['Class Teacher', 'Co-Ordinator', 'Principal', 'Parent']
    : ['Principal', 'Class Teacher', 'Sign. of Parent'];
  return `<div class="card">
    ${masthead(data.branding || {})}
    <div class="title">${title}</div>
    ${data.academicYear ? `<div class="session">Academic Session : ${esc(data.academicYear)}</div>` : ''}
    ${infoGrid(data, s, isPre)}
    ${marksTbl}
    ${areaSections(data, s)}
    ${s.remark ? `<div class="remark"><b>Class Teacher Remark:</b> ${esc(s.remark)}</div>` : ''}
    ${s.promotedTo && data.term === 2 ? `<div class="promo">CONGRATULATIONS! PROMOTED TO CLASS: ${esc(s.promotedTo)}</div>` : ''}
    ${legends(data)}
    <div class="sigs">${sigs.map((x) => `<div class="sig">${esc(x)}</div>`).join('')}</div>
  </div>`;
}

export function buildReportCardsHtml(data, students, bw = false) {
  const cards = students.map((s) => card(data, s)).join('');
  // viewport width = the card's pixel width (210mm ≈ 794px) so a phone scales the whole card to fit
  // its screen width (readable without pinch-zoom). Ignored for print, which uses the A4 @page below.
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=794, initial-scale=1"><title>Report Cards</title><style>
    * { box-sizing: border-box; }
    @page { size: A4; margin: 0; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    /* One card per A4 page. @page margin:0 makes the card's own padding the print margin; a
       break is forced only BETWEEN cards (never after the last) so there is no trailing blank page.
       min-height is a hair under 297mm so sub-mm rounding can't spill a card onto a second page. */
    .card { width: 210mm; min-height: 296mm; padding: 10mm; break-inside: avoid; }
    .card + .card { break-before: page; }
    .mast { display: flex; align-items: stretch; gap: 6px; background: #37407e; color: #f3f2ea; border-radius: 6px; padding: 12px 12px 11px; }
    .crest-col { width: 92px; flex: 0 0 92px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
    .crest { width: 62px; height: 62px; border-radius: 50%; overflow: hidden; background: #fff; display: flex; align-items: center; justify-content: center; }
    .crest img { width: 100%; height: 100%; object-fit: contain; }
    .crest-cap { text-align: center; font-size: 9.5px; font-weight: 700; line-height: 1.25; }
    .crest-cap span { display: block; color: #e7c869; font-size: 8.5px; font-weight: 600; }
    .mast-mid { flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: center; }
    .sname { font-size: 26px; font-weight: 800; letter-spacing: .2px; color:#e7c869; line-height: 1.1; white-space: nowrap; }
    .motto { font-style: italic; font-size: 14px; opacity: .95; margin: 2px 0 5px; }
    .addr { font-size: 12px; opacity: .95; line-height: 1.7; }
    .addr.small { opacity: .8; }
    .title { text-align: center; color: #7a1420; font-weight: 800; font-size: 16px; margin: 8px 0 2px; letter-spacing: .5px; }
    .session { text-align:center; font-size:12px; font-weight:700; margin-bottom:6px; }
    .info-wrap { display: flex; gap: 8px; align-items: stretch; }
    table.info { border-collapse: collapse; width: 100%; font-size: 11px; }
    table.info td { border: 1px solid #999; padding: 3px 6px; }
    table.info td.k { background: #f2f2f2; font-weight: 600; white-space: nowrap; }
    table.info td.v { min-width: 120px; }
    .photo { width: 90px; border: 1px solid #999; display: flex; align-items: center; justify-content: center; }
    .photo img { max-width: 88px; max-height: 110px; }
    table.marks { border-collapse: collapse; width: 100%; font-size: 11px; margin-top: 8px; }
    table.marks th, table.marks td { border: 1px solid #999; padding: 3px 4px; text-align: center; }
    table.marks th.term-h { background: #eceaf5; font-size: 12px; }
    table.marks th .mx { font-weight: 400; font-size: 9px; }
    table.marks .subj { text-align: left; font-weight: 600; }
    table.marks td.tot { font-weight: 700; white-space: nowrap; }
    table.marks td.grd { font-weight: 700; }
    .abs { display:inline-block; min-width:15px; height:15px; line-height:12px; padding:0 2px; border:1.5px solid #c0392b; color:#c0392b; border-radius:50%; font-weight:700; font-size:9.5px; box-sizing:content-box; }
    .totals { text-align: right; font-size: 11px; font-weight: 700; margin: 3px 2px 0; }
    .areas { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .area-block { flex: 1 1 240px; }
    table.area { border-collapse: collapse; width: 100%; font-size: 10.5px; }
    table.area th, table.area td { border: 1px solid #999; padding: 3px 6px; }
    table.area th.k, table.area td.k { text-align: left; }
    table.area th { background: #f2f2f2; }
    table.area .g { text-align: center; width: 70px; }
    .remark { font-size: 11px; margin-top: 8px; border: 1px solid #999; padding: 4px 6px; }
    .promo { font-size: 11px; font-weight: 700; margin-top: 6px; }
    .legends { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
    .leg { width: 100%; }
    .leg-t { text-align: center; font-weight: 700; font-size: 10.5px; margin-bottom: 2px; }
    table.leg-tbl { border-collapse: collapse; width: 100%; font-size: 9.5px; }
    table.leg-tbl td { border: 1px solid #999; padding: 2px 4px; text-align: center; }
    table.leg-tbl td.lg { font-weight: 700; background: #f2f2f2; }
    .sigs { display: flex; justify-content: space-between; margin-top: 28px; padding: 0 6px; }
    .sig { font-size: 11px; font-weight: 600; border-top: 1px solid #333; padding-top: 3px; min-width: 120px; text-align: center; }

    /* Black & white — for mono laser printers. Drop all colour to high-contrast black on white and
       darken the hairline borders (light greys print faint/washed-out on a B&W laser). */
    body.bw .mast { background: #fff; color: #000; border: 1.5px solid #000; }
    body.bw .sname { color: #000; }
    body.bw .motto, body.bw .addr { color: #000; opacity: 1; }
    body.bw .crest { border: 1px solid #000; }
    body.bw .crest-cap, body.bw .crest-cap span { color: #000; }
    body.bw .title { color: #000; }
    body.bw table.marks th.term-h { background: #e6e6e6; }
    body.bw .abs { border-color: #000; color: #000; }
    body.bw table.info td, body.bw table.marks th, body.bw table.marks td,
    body.bw table.area th, body.bw table.area td, body.bw table.leg-tbl td,
    body.bw .remark, body.bw .photo { border-color: #000; }
    body.bw table.info td.k, body.bw table.area th, body.bw table.leg-tbl td.lg { background: #ececec; }
  </style></head><body class="${bw ? 'bw' : ''}">${cards}</body></html>`;
}

// Opens the browser print dialog for the given cards via a hidden iframe. The browser can't tell
// us whether the user actually printed or hit Cancel (afterprint fires either way), so `onAfterPrint`
// runs once the dialog closes — the caller uses it to ASK before recording the print (admit-card pattern).
export function printReportCards(data, students, onAfterPrint, bw = false) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  win.document.open();
  win.document.write(buildReportCardsHtml(data, students, bw));
  win.document.close();
  let done = false;
  const after = () => {
    if (done) return; done = true;
    setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* gone */ } }, 500);
    if (onAfterPrint) onAfterPrint();
  };
  win.onafterprint = after;
  setTimeout(() => { win.focus(); win.print(); }, 400);
  setTimeout(after, 60000); // safety: some browsers never fire onafterprint
}

// exported for the preview pane (single card)
export { card as buildSingleCard, DOW };
