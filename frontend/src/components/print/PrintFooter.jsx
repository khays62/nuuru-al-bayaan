import React from 'react';

export default function PrintFooter({ left = 'Nuuru Al-Bayaan', date, showPage = true }) {
  const printedOn = date || new Date().toLocaleString();
  return (
    <div className="print-only print-footer">
      <div style={{ justifySelf: 'start', textAlign: 'left' }}>{left}</div>
      <div style={{ justifySelf: 'center', textAlign: 'center' }}>{printedOn}</div>
      <div style={{ justifySelf: 'end', textAlign: 'right' }}>{showPage ? <>Page <span className="pageNumber" /> of <span className="totalPages" /></> : null}</div>
    </div>
  );
}
