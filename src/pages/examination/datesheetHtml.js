// Build a print-ready HTML datesheet in the school's original format (landscape, bordered
// box, crest + heading, DATE/DAY × grade grid, NOTE block, BEST OF LUCK). Printed from a
// hidden iframe → the office saves it as PDF. Everything is inlined (logo is a data URI).

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const ddmmyyyy = (d) => { if (!d) return ''; const [y, m, day] = String(d).split('-'); return `${day}-${m}-${y}`; };
const dayName = (d) => (d ? DOW[new Date(`${d}T00:00:00`).getDay()] : '');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const DEFAULT_DATESHEET_NOTES = [
  'All the dues must be clear before the exam. If you have already paid, please ignore it.',
  'This Exam is mandatory for all the students.',
  'Kindly prepare all the work done in the Book, N.B. and Revision work.',
];

const DEF_SCHOOL = 'Dr. B. P. Agrawal Shiksha Niketan';
const DEF_MOTTO = 'Chariot of Knowledge';
const DEF_ADDR = 'Kalyankunj, Kanpur Road (Farrukhabad)';

export function buildDatesheetHtml(data) {
  const { examName, grades = [], dates = [], papers = [], logoDataUri, notes } = data;
  const schoolName = data.schoolName || DEF_SCHOOL;
  const motto = data.motto || DEF_MOTTO;
  const address = data.address || DEF_ADDR;
  const noteList = (notes && notes.length ? notes : DEFAULT_DATESHEET_NOTES);
  const range = dates.length ? `[ ${ddmmyyyy(dates[0])} to ${ddmmyyyy(dates[dates.length - 1])} ]` : '';
  const cell = (g, d) => papers.find((p) => p.grade === g.grade && p.examDate === d)?.subjectLabel;

  const headCols = grades.map((g) => `<th>${esc(g.grade)}</th>`).join('');
  const rows = dates.map((d) => `
    <tr>
      <td class="dt">${esc(ddmmyyyy(d))}</td>
      <td class="day">${esc(dayName(d))}</td>
      ${grades.map((g) => `<td>${esc(cell(g, d) || '---')}</td>`).join('')}
    </tr>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Datesheet</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Times New Roman', Georgia, serif; color: #000; }
    .sheet { border: 2px solid #000; padding: 10px 14px 16px; }
    .head { display: flex; align-items: center; gap: 14px; }
    .head .logo { width: 74px; height: 74px; object-fit: contain; }
    .head .txt { flex: 1; text-align: center; line-height: 1.2; }
    .school { font-size: 26px; font-weight: 700; letter-spacing: .3px; text-decoration: underline; text-underline-offset: 3px; }
    .tag { font-size: 13px; }
    .addr { font-size: 15px; font-weight: 700; margin-top: 2px; }
    .title { text-align: center; margin: 10px 0 2px; }
    .title .t { font-size: 15px; font-weight: 700; text-decoration: underline; text-transform: uppercase; letter-spacing: .5px; }
    .title .r { font-size: 13px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #000; padding: 4px 5px; text-align: center; font-size: 12px; vertical-align: middle; }
    thead th { font-weight: 700; text-transform: uppercase; letter-spacing: .3px; }
    td.dt { font-weight: 700; white-space: nowrap; }
    td.day { font-weight: 700; white-space: nowrap; }
    td { height: 30px; }
    .note { margin-top: 12px; font-size: 12.5px; }
    .note b { text-decoration: underline; letter-spacing: .5px; }
    .note ul { margin: 4px 0 0; padding-left: 4px; list-style: none; }
    .note li { position: relative; padding-left: 20px; margin: 2px 0; }
    .note li::before { content: '\\27A2'; position: absolute; left: 0; }
    .luck { text-align: center; font-weight: 700; text-decoration: underline; font-size: 14px; margin-top: 12px; letter-spacing: 1px; }
  </style></head><body>
    <div class="sheet">
      <div class="head">
        ${logoDataUri ? `<img class="logo" src="${logoDataUri}">` : '<div class="logo"></div>'}
        <div class="txt">
          <div class="school">${esc(schoolName)}</div>
          <div class="tag">——— ${esc(motto)} ———</div>
          <div class="addr">${esc(address)}</div>
        </div>
        ${logoDataUri ? '<div class="logo"></div>' : ''}
      </div>
      <div class="title">
        <div class="t">Datesheet for ${esc(examName || 'Examination')}</div>
        <div class="r">${esc(range)}</div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Day</th>${headCols}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="note">
        <b>NOTE-</b>
        <ul>${noteList.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
      </div>
      <div class="luck">BEST OF LUCK</div>
    </div>
  </body></html>`;
}

// Render the HTML into a hidden iframe and print it (browser → Save as PDF).
export function printDatesheet(data) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  win.document.open();
  win.document.write(buildDatesheetHtml(data));
  win.document.close();
  let done = false;
  const cleanup = () => { if (done) return; done = true; setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* gone */ } }, 500); };
  win.onafterprint = cleanup;
  setTimeout(() => { win.focus(); win.print(); }, 300);
  setTimeout(cleanup, 60000);
}
