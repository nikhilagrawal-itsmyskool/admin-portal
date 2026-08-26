import React from 'react';
import { fmtDate } from '../../utils/date';

// Print-only admit-card sheet. Renders `cardsPerPage` (3 or 4) cards per A4 page using a
// CSS grid, isolates itself for printing via the classic visibility trick, and inlines
// logo / office stamp / QR as data URIs (so it works from the browser print dialog with
// no network). One card == the physical artifact: header, paper schedule table with a
// blank "Invigilator sign" row for wet ink, and the incharge + office-stamp footer.
export default function AdmitCardPrintLayout({ data, cardsPerPage }) {
  if (!data) return null;
  const per = cardsPerPage === 3 ? 3 : 4;
  const cols = per === 4 ? 2 : 1;
  const { exam, section, branding, papers, cards } = data;

  const pages = [];
  for (let i = 0; i < cards.length; i += per) pages.push(cards.slice(i, i + per));

  return (
    <div className="admit-print-root">
      <style>{`
        @media print { @page { size: A4 portrait; margin: 8mm; } body { margin: 0; } }
        .admit-print-root { display: none; }
        @media print {
          body * { visibility: hidden; }
          .admit-print-root, .admit-print-root * { visibility: visible; }
          .admit-print-root { display: block; position: absolute; left: 0; top: 0; width: 100%; }
        }
        .admit-page { page-break-after: always; }
        .admit-grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 6mm; }
        .admit-card {
          border: 1px solid #000; border-radius: 4px; padding: 6px 8px;
          font-family: 'Times New Roman', serif; color: #000; break-inside: avoid;
          display: flex; flex-direction: column; min-height: ${per === 4 ? '128mm' : '88mm'};
        }
        .admit-head { display: flex; align-items: center; gap: 8px; }
        .admit-logo { width: 42px; height: 42px; object-fit: contain; }
        .admit-head-text { flex: 1; text-align: center; line-height: 1.15; }
        .admit-school { font-size: 15px; font-weight: 700; }
        .admit-tag { font-size: 10px; }
        .admit-exam { font-size: 11px; font-weight: 600; }
        .admit-qr { width: 52px; height: 52px; }
        .admit-title { text-align: center; font-weight: 700; text-decoration: underline; font-size: 12px; margin: 3px 0; letter-spacing: 1px; }
        .admit-meta { display: flex; justify-content: space-between; font-size: 12px; margin: 2px 0; }
        .admit-table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11px; }
        .admit-table th, .admit-table td { border: 1px solid #000; padding: 2px 3px; text-align: center; height: 16px; }
        .admit-table .rowlabel { font-weight: 700; text-align: left; white-space: nowrap; width: 62px; }
        .admit-sign-row td { height: 30px; }
        .admit-foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; padding-top: 8px; font-size: 11px; }
        .admit-stamp { max-width: 90px; max-height: 46px; object-fit: contain; }
        .admit-line { display: inline-block; min-width: 90px; border-bottom: 1px dotted #000; }
      `}</style>

      {pages.map((pageCards, pi) => (
        <div className="admit-page" key={pi}>
          <div className="admit-grid">
            {pageCards.map((c) => (
              <div className="admit-card" key={c.admitCardId}>
                <div className="admit-head">
                  {branding?.logoDataUri
                    ? <img className="admit-logo" src={branding.logoDataUri} alt="" />
                    : <div className="admit-logo" />}
                  <div className="admit-head-text">
                    <div className="admit-school">Dr. B. P. Agrawal Shiksha Niketan</div>
                    <div className="admit-tag">— Chariot of Knowledge —</div>
                    <div className="admit-exam">{exam.name} · {exam.academicYearName}</div>
                  </div>
                  {c.qrDataUri ? <img className="admit-qr" src={c.qrDataUri} alt="" /> : <div className="admit-qr" />}
                </div>

                <div className="admit-title">ADMIT CARD</div>
                <div className="admit-meta">
                  <span><b>Name:</b> {c.name}</span>
                  <span><b>Class:</b> {section.name}</span>
                </div>
                <div className="admit-meta">
                  <span><b>Roll No:</b> <span className="admit-line" />&nbsp;</span>
                </div>

                <table className="admit-table">
                  <tbody>
                    <tr>
                      <td className="rowlabel">Date</td>
                      {papers.map((p) => <td key={p.examDate}>{fmtDate(p.examDate)}</td>)}
                    </tr>
                    <tr>
                      <td className="rowlabel">Subject</td>
                      {papers.map((p) => <td key={p.examDate}>{p.subjectLabel}</td>)}
                    </tr>
                    <tr className="admit-sign-row">
                      <td className="rowlabel">Invigilator sign</td>
                      {papers.map((p) => <td key={p.examDate} />)}
                    </tr>
                  </tbody>
                </table>

                <div className="admit-foot">
                  <span>Examination Incharge</span>
                  <span style={{ textAlign: 'center' }}>
                    {branding?.stampDataUri
                      ? <img className="admit-stamp" src={branding.stampDataUri} alt="" />
                      : null}
                    <div>Office sign &amp; Stamp</div>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
