// ActionButton.jsx
// Qayb guud oo badhamo (icon + qoraal) leh. Variant wuxuu dhigaa class‑yada caadiga ah.
// Contract: { variant?: 'primary'|'neutral'|'danger'|'info', onClick?: Function, title?: string, icon?: ReactNode, children }
import React from 'react';

const variants = {
  primary: 'border-blue-300 bg-white text-blue-700 hover:bg-blue-50',
  neutral: 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100',
  danger: 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100',
  info: 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
};

export default function ActionButton({ variant = 'neutral', onClick, title, icon, children, className = '', disabled = false }) {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border shadow-sm text-sm disabled:opacity-60 disabled:cursor-not-allowed';
  const cls = `${base} ${variants[variant] || variants.neutral} ${className}`;
  return (
    <button type="button" title={title} onClick={onClick} className={cls} disabled={disabled}>
      {icon ? <span className="shrink-0">{icon}</span> : null}
      {children}
    </button>
  );
}
