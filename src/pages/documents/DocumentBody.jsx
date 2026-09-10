import React from 'react';
import { Box } from '@mui/material';

// Renders a policy document's HTML body with print-quality typography. The body_html
// authored in the portal already carries the school header + sections; this just gives it
// consistent, readable styling on screen (and the same markup is what prints).
const docSx = {
  color: '#2e3a59',
  fontSize: 14.5,
  lineHeight: 1.6,
  '& .doc-head': { textAlign: 'center', borderBottom: '2px solid #222b45', pb: 1.5, mb: 2 },
  '& .doc-head h1': { fontSize: 20, fontWeight: 800, color: '#222b45', m: '6px 0 2px', textTransform: 'uppercase', letterSpacing: '.01em' },
  '& .doc-head h2': { fontSize: 17, fontWeight: 800, color: '#222b45', m: 0 },
  '& .doc-head .chariot': { fontSize: 12, color: '#8f9bb3', letterSpacing: '.06em', m: '2px 0' },
  '& .doc-head .addr': { fontSize: 12.5, color: '#5b6684', m: 0 },
  '& .doc-head .meta': { fontSize: 12.5, color: '#5b6684', m: '4px 0 0' },
  '& h3': { fontSize: 16, fontWeight: 800, color: '#222b45', mt: 3, mb: 0.75 },
  '& h4': { fontSize: 14, fontWeight: 800, color: '#2e3a59', mt: 2, mb: 0.5 },
  '& p': { m: '0 0 10px' },
  '& ul': { m: '0 0 12px', pl: 3 },
  '& li': { mb: 0.5 },
  '& em': { color: '#3a4560' },
  '& .doc-table': { borderCollapse: 'collapse', width: 'auto', minWidth: 320, m: '4px 0 14px', fontSize: 13.5 },
  '& .doc-table th, & .doc-table td': { border: '1px solid #e4e9f2', p: '7px 14px', textAlign: 'left' },
  '& .doc-table th': { background: '#f7f9fc', fontWeight: 700, color: '#5b6684' },
  '& .declaration': { mt: 3, pt: 2, borderTop: '1px dashed #cdd5e4' },
  '& .declaration h3': { mt: 0 },
};

export default function DocumentBody({ html }) {
  return <Box className="policy-doc" sx={docSx} dangerouslySetInnerHTML={{ __html: html || '' }} />;
}

// Open a print window with the document body + a physical signature block appended, so the
// staff member can print, sign the last page by hand, and upload it. Uses only inline CSS
// (a fresh document, no app styles).
export function printDocument(doc) {
  const w = window.open('', '_blank');
  if (!w) return;
  const sigBlock = doc.requiresAck ? `
    <div style="margin-top:28px;padding-top:14px;border-top:1px dashed #999;page-break-inside:avoid">
      <div style="font-weight:bold;text-transform:uppercase;letter-spacing:.04em;margin-bottom:14px">Signature</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:14px 0">Employee Name: ___________________________________</td></tr>
        <tr><td style="padding:14px 0">Designation: _______________________________________</td></tr>
        <tr><td style="padding:14px 0">Employee ID: _______________________________________</td></tr>
        <tr><td style="padding:14px 0">Signature: _________________________________________</td></tr>
        <tr><td style="padding:14px 0">Date: ______________________________________________</td></tr>
      </table>
    </div>` : '';
  w.document.write(`<!doctype html><html><head><title>${doc.title || 'Document'}</title>
    <style>
      body{font-family:Georgia,'Times New Roman',serif;color:#1f2733;line-height:1.6;max-width:720px;margin:32px auto;padding:0 24px}
      h1{font-size:19px;text-transform:uppercase;text-align:center;margin:6px 0 2px}
      h2{font-size:16px;text-align:center;margin:0}
      h3{font-size:15px;margin:20px 0 6px;border-bottom:1px solid #ddd;padding-bottom:3px}
      h4{font-size:13.5px;margin:14px 0 4px}
      .doc-head{text-align:center;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:16px}
      .doc-head .chariot,.doc-head .addr,.doc-head .meta{font-size:12px;color:#555;margin:2px 0}
      p{margin:0 0 9px}ul{margin:0 0 11px;padding-left:22px}li{margin-bottom:3px}
      table.doc-table{border-collapse:collapse;margin:6px 0 12px}
      table.doc-table th,table.doc-table td{border:1px solid #999;padding:6px 12px;text-align:left}
      .declaration{margin-top:18px;border-top:1px dashed #999;padding-top:10px}
    </style></head><body>${doc.bodyHtml || ''}${sigBlock}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch (e) { /* user can print manually */ } }, 350);
}
