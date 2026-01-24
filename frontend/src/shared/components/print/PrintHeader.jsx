import React from 'react';
import headerImg from '../../../assets/nuuruBayaanHeader.png';

// Image-only header (non-fixed): appears once where inserted, only on print
export default function PrintHeader() {
  return (
    <div className="print-only" style={{ marginBottom: '8mm' }}>
      <img src={headerImg} alt="Nuuru Al-Bayaan" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '28mm', objectFit: 'contain' }} />
    </div>
  );
}
