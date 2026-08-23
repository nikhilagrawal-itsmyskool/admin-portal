import React from 'react';
import PrintRoot from '../timetable/components/PrintRoot';
import { monthGridSun, WEEKDAY_HEADS, CHIP_CODES, monthLabel } from './calendarUtils';

// A clean A4-landscape month grid for printing (mounted only while printing via
// PrintRoot + print.css). Shows holiday, thought, and each day's entries as text.
export default function MonthPrint({ year, month, daysByDate, schoolName }) {
  const weeks = monthGridSun(year, month);
  const cellStyle = { border: '1px solid #ccc', verticalAlign: 'top', padding: '4px 5px', width: '14.28%', height: 96 };
  return (
    <PrintRoot>
      <div style={{ fontFamily: 'inherit', color: '#000' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <b style={{ fontSize: 15 }}>{schoolName || 'Activity Calendar'} — {monthLabel(year, month)}</b>
          <span style={{ fontSize: 12 }}>Academic Calendar</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 10 }}>
          <thead>
            <tr>{WEEKDAY_HEADS.map((h) => <th key={h} style={{ border: '1px solid #ccc', padding: 3, background: '#f0f0f0', fontSize: 10 }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((cell) => {
                  if (!cell.inMonth) return <td key={cell.date} style={{ ...cellStyle, background: '#fafafa' }} />;
                  const d = daysByDate[cell.date];
                  const hol = d?.holiday;
                  const theme = (d?.entries || []).find((e) => e.typeCode === 'theme');
                  const others = CHIP_CODES.flatMap((c) => (d?.entries || []).filter((e) => e.typeCode === c));
                  return (
                    <td key={cell.date} style={{ ...cellStyle, background: hol ? '#fdeceb' : '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <b>{cell.day}</b>
                        {hol && <span style={{ fontSize: 8, fontWeight: 700, color: hol.kind === 'restricted' ? '#b26a00' : '#c62828' }}>{hol.kind === 'restricted' ? 'RH' : 'HOLIDAY'}</span>}
                      </div>
                      {hol && <div style={{ fontSize: 8.5, fontWeight: 600 }}>{hol.name}</div>}
                      {theme && <div style={{ fontStyle: 'italic', fontSize: 8.5, margin: '1px 0' }}>{theme.value}</div>}
                      {others.map((e) => <div key={e.uuid} style={{ fontSize: 8.5 }}>• {e.value}</div>)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PrintRoot>
  );
}
