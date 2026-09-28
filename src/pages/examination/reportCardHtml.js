// Report-card HTML — one scheme-driven template for all four bands (1-3, 4-5, 6-9, and the
// pre-primary "Progress Report"). Data comes from GET /report/cards/{classId}/{term}; everything
// is inlined (logos are data URIs) and printed via a hidden iframe (house pattern → Save as PDF).

const esc = (v) => (v == null ? '' : String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function masthead(b) {
  const left = b.boardLogoDataUri || b.logoDataUri;
  const right = b.logoDataUri || b.boardLogoDataUri;
  return `<div class="mast">
    <div class="crest">${left ? `<img src="${left}" alt="">` : ''}</div>
    <div class="mast-mid">
      <div class="sname">${esc(b.schoolName || 'Report Card')}</div>
      ${b.motto ? `<div class="motto">${esc(b.motto)}</div>` : ''}
      ${b.address ? `<div class="addr">${esc(b.address)}</div>` : ''}
      <div class="addr">${[b.contact ? `Contact: ${esc(b.contact)}` : '', b.email ? `E-mail: ${esc(b.email)}` : '', b.website ? esc(b.website) : ''].filter(Boolean).join(' · ')}</div>
      <div class="addr small">${[b.affiliationNo ? `Affiliation No: ${esc(b.affiliationNo)}` : '', b.schoolCode ? `School Code: ${esc(b.schoolCode)}` : ''].filter(Boolean).join(' &nbsp;·&nbsp; ')}</div>
    </div>
    <div class="crest">${right && right !== left ? `<img src="${right}" alt="">` : ''}</div>
  </div>`;
}

function infoGrid(data, s, withPhoto) {
  const rows = [
    ['Name', s.name, 'Class', data.className],
    ["Father's Name", s.fatherName, "Mother's Name", s.motherName],
    ['Roll No', s.rollNumber, 'D.O.B', s.dob],
    ['Admission No', s.admissionNumber, 'Attendance', s.attendancePresent != null && s.attendanceTotal != null ? `${s.attendancePresent}/${s.attendanceTotal}` : ''],
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
    ${comps.map((c) => `<th>${esc(c.label)}<div class="mx">(${c.max})</div></th>`).join('')}
    <th>TOTAL</th><th>GRADE</th></tr>`;
  return (s) => {
    const body = data.scheme.subjects.map((subj) => {
      const t = s.subjectTotals[subj.code] || {};
      const m = s.marks[subj.code] || {};
      return `<tr>
        <td class="subj">${esc(subj.label)}</td>
        ${comps.map((c) => `<td>${m[c.code] == null ? '' : esc(m[c.code])}</td>`).join('')}
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
      return `<tr><td class="k">${esc(a.label)}</td><td class="g">${esc(v)}</td></tr>`;
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
  const coL = co.length ? `<div class="leg">
    <div class="leg-t">Grading scale for Co-Scholastic Areas</div>
    <table class="leg-tbl"><tr>${co.map((g) => `<td class="lg">${esc(g.grade)}</td>`).join('')}</tr>
    <tr>${co.map((g) => `<td>${esc(g.label)}</td>`).join('')}</tr></table></div>` : '';
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
    ${infoGrid(data, s, isPre)}
    ${marksTbl}
    ${areaSections(data, s)}
    ${s.remark ? `<div class="remark"><b>Class Teacher Remark:</b> ${esc(s.remark)}</div>` : ''}
    ${s.promotedTo ? `<div class="promo">CONGRATULATIONS! PROMOTED TO CLASS: ${esc(s.promotedTo)}</div>` : ''}
    ${legends(data)}
    <div class="sigs">${sigs.map((x) => `<div class="sig">${esc(x)}</div>`).join('')}</div>
  </div>`;
}

export function buildReportCardsHtml(data, students) {
  const cards = students.map((s) => card(data, s)).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Report Cards</title><style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; }
    .card { width: 210mm; min-height: 297mm; padding: 10mm; page-break-after: always; }
    .card:last-child { page-break-after: auto; }
    .mast { display: flex; align-items: center; gap: 10px; background: #23264d; color: #f3f2ea; border-radius: 6px; padding: 8px 12px; }
    .crest { width: 62px; text-align: center; }
    .crest img { max-width: 60px; max-height: 60px; }
    .mast-mid { flex: 1; text-align: center; }
    .sname { font-size: 22px; font-weight: 800; letter-spacing: .3px; }
    .motto { font-style: italic; font-size: 12px; opacity: .9; }
    .addr { font-size: 10.5px; opacity: .92; }
    .addr.small { opacity: .8; }
    .title { text-align: center; color: #7a1420; font-weight: 800; font-size: 16px; margin: 8px 0 6px; letter-spacing: .5px; }
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
    .legends { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
    .leg { flex: 1 1 300px; }
    .leg-t { text-align: center; font-weight: 700; font-size: 10.5px; margin-bottom: 2px; }
    table.leg-tbl { border-collapse: collapse; width: 100%; font-size: 9.5px; }
    table.leg-tbl td { border: 1px solid #999; padding: 2px 4px; text-align: center; }
    table.leg-tbl td.lg { font-weight: 700; background: #f2f2f2; }
    .sigs { display: flex; justify-content: space-between; margin-top: 28px; padding: 0 6px; }
    .sig { font-size: 11px; font-weight: 600; border-top: 1px solid #333; padding-top: 3px; min-width: 120px; text-align: center; }
    @media print { .card { padding: 8mm; } }
  </style></head><body>${cards}</body></html>`;
}

export function printReportCards(data, students) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  win.document.open();
  win.document.write(buildReportCardsHtml(data, students));
  win.document.close();
  let done = false;
  const cleanup = () => { if (done) return; done = true; setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* gone */ } }, 500); };
  win.onafterprint = cleanup;
  setTimeout(() => { win.focus(); win.print(); }, 400);
  setTimeout(cleanup, 60000);
}

// exported for the preview pane (single card)
export { card as buildSingleCard, DOW };
