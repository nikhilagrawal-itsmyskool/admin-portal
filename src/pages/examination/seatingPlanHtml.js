// Build a print-ready HTML seating plan in the school's sheet format (portrait, bordered
// box, crest + heading, a numbered two-column list of rooms → section/roll-range lines, and
// an Examination Incharge + stamp footer). Printed from a hidden iframe → save as PDF.

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const DEF_SCHOOL = 'Dr. B. P. Agrawal Shiksha Niketan';
const DEF_MOTTO = 'Chariot of Knowledge';
const DEF_ADDR = 'Kalyankunj, Kanpur Road (Farrukhabad)';

const rangeText = (a) => {
  if (a.rollFrom == null && a.rollTo == null) return '';
  if (a.rollTo == null) return String(a.rollFrom);
  if (a.rollFrom === a.rollTo) return String(a.rollFrom);
  return `${a.rollFrom}-${a.rollTo}`;
};

export function buildSeatingPlanHtml(data) {
  const { examName, rooms = [], inchargeName, logoDataUri, stampDataUri } = data;
  const schoolName = data.schoolName || DEF_SCHOOL;
  const motto = data.motto || DEF_MOTTO;
  const address = data.address || DEF_ADDR;

  const roomCell = (rm, i) => {
    const lines = (rm.allocations || []).map((a) => {
      const r = rangeText(a);
      return `<div class="alloc">${esc(a.label || '')}${r ? ` <span class="arrow">&#8594;</span> ${esc(r)}` : ''}</div>`;
    }).join('');
    return `<tr>
      <td class="no">${i + 1}).</td>
      <td class="rname">Room no. ${esc(rm.name)}</td>
      <td class="allocs">${lines || '<span class="muted">—</span>'}</td>
    </tr>`;
  };

  const half = Math.ceil(rooms.length / 2);
  const left = rooms.slice(0, half).map((rm, i) => roomCell(rm, i)).join('');
  const right = rooms.slice(half).map((rm, i) => roomCell(rm, i + half)).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Seating Plan</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Times New Roman', Georgia, serif; color: #000; }
    .sheet { border: 2px solid #000; padding: 10px 14px 14px; }
    .head { display: flex; align-items: center; gap: 14px; }
    .head .logo { width: 66px; height: 66px; object-fit: contain; }
    .head .txt { flex: 1; text-align: center; line-height: 1.2; }
    .school { font-size: 23px; font-weight: 700; letter-spacing: .3px; color: #1b3c8f; }
    .tag { font-size: 12px; }
    .addr { font-size: 14px; font-weight: 700; margin-top: 2px; }
    .title { text-align: center; margin: 8px 0 6px; }
    .title .t { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #1b3c8f; }
    .title .r { font-size: 12.5px; font-weight: 700; }
    .cols { display: flex; gap: 0; }
    .cols table { width: 50%; border-collapse: collapse; }
    table.plan td { border: 1px solid #000; padding: 4px 6px; font-size: 11.5px; vertical-align: top; }
    td.no { width: 26px; font-weight: 700; text-align: right; white-space: nowrap; }
    td.rname { width: 96px; font-weight: 700; }
    td.allocs { }
    .alloc { white-space: nowrap; }
    .arrow { }
    .muted { opacity: .4; }
    .foot { margin-top: 16px; display: flex; align-items: flex-end; justify-content: space-between; }
    .stampbox { text-align: center; }
    .stampbox img { height: 70px; object-fit: contain; }
    .incharge { text-align: center; font-size: 13px; }
    .incharge .lbl { font-weight: 700; }
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
        <div class="t">${esc(examName || 'Examination')} — Seating Plan</div>
      </div>
      <div class="cols">
        <table class="plan"><tbody>${left}</tbody></table>
        <table class="plan"><tbody>${right}</tbody></table>
      </div>
      <div class="foot">
        <div></div>
        <div class="incharge">
          <div class="stampbox">${stampDataUri ? `<img src="${stampDataUri}">` : ''}</div>
          <div class="lbl">Examination Incharge</div>
          ${inchargeName ? `<div>${esc(inchargeName)}</div>` : ''}
        </div>
      </div>
    </div>
  </body></html>`;
}

export function printSeatingPlan(data) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  win.document.open();
  win.document.write(buildSeatingPlanHtml(data));
  win.document.close();
  let done = false;
  const cleanup = () => { if (done) return; done = true; setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* gone */ } }, 500); };
  win.onafterprint = cleanup;
  setTimeout(() => { win.focus(); win.print(); }, 300);
  setTimeout(cleanup, 60000);
}
