// Spinner.jsx
// Wrapper around react-spinners so haddii aan beddelno library mustaqbalka hal meel kaliya ayaan taabaneynaa.
import React from 'react';
import { ClipLoader } from 'react-spinners';

export default function Spinner({ size = 32, color = 'var(--nb-color-focus)', className = '' }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <ClipLoader size={size} color={color} speedMultiplier={0.9} />
    </div>
  );
}
