import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function AttendanceStatusPills({
  value,
  remarks,
  onChange,
  onChangeRemarks,
  onPickExcusedPreset,
  reasonWordLimit = 40,
}) {
  const opts = [
    { value: 'present', label: 'Present' },
    { value: 'absent', label: 'Absent' },
    { value: 'late', label: 'Late' },
    { value: 'excused', label: 'Excused' },
  ];

  const [moreOpen, setMoreOpen] = useState(false);
  const extras = [
    { value: 'sick', label: 'Sick' },
    { value: 'medical', label: 'Medical appointment' },
    { value: 'family', label: 'Family emergency' },
    { value: 'other', label: 'Other' },
  ];

  const extraValues = extras.map(e => e.value);
  const isExtraSelected = extraValues.includes(value);
  const selectedExtraLabel = isExtraSelected ? (extras.find(e => e.value === value)?.label || '') : '';

  // Keep old prop name for compatibility; now it picks an extra status.
  const pickExtra = (nextValue) => {
    if (typeof onPickExcusedPreset === 'function') onPickExcusedPreset(nextValue);
  };

  const moreBtnRef = useRef(null);
  const moreMenuRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);

  const computePos = () => {
    const el = moreBtnRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const width = 240;
    const gap = 6;
    const top = r.bottom + gap;
    const leftPreferred = r.right - width;
    const left = Math.max(8, Math.min(leftPreferred, window.innerWidth - width - 8));
    return { top, left, width };
  };

  const closeMenu = () => setMoreOpen(false);

  const toggleMenu = () => {
    if (moreOpen) {
      closeMenu();
      return;
    }
    const pos = computePos();
    if (pos) setMenuPos(pos);
    setMoreOpen(true);
  };

  useEffect(() => {
    if (!moreOpen) return;

    const updatePos = () => {
      const pos = computePos();
      if (pos) setMenuPos(pos);
    };

    updatePos();

    const onDocMouseDown = (e) => {
      const btn = moreBtnRef.current;
      if (btn && btn.contains(e.target)) return;
      const menu = moreMenuRef.current;
      if (menu && menu.contains(e.target)) return;
      closeMenu();
    };

    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    document.addEventListener('mousedown', onDocMouseDown);

    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
      document.removeEventListener('mousedown', onDocMouseDown);
    };
  }, [moreOpen]);

  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex rounded-md border border-gray-300 overflow-hidden bg-white">
        {opts.map((o, idx) => {
          const active = value === o.value;
          const isLast = idx === opts.length - 1;
          return (
            <div key={o.value} className="relative inline-flex">
              <button
                type="button"
                onClick={() => onChange(o.value)}
                className={
                  `px-2.5 py-1 text-xs font-medium ` +
                  (!isLast ? 'border-r border-gray-300 ' : '') +
                  (active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')
                }
              >
                {o.label}
              </button>
            </div>
          );
        })}
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="More statuses"
          onClick={toggleMenu}
          ref={moreBtnRef}
          className={
            `inline-flex items-center justify-center h-7 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-2 ` +
            (isExtraSelected ? '!bg-blue-600 !text-white !border-blue-600' : '')
          }
        >
          <span className="text-xs font-semibold">⋮</span>
          {isExtraSelected && (
            <span className="ml-1 text-xs font-medium whitespace-nowrap">{selectedExtraLabel}</span>
          )}
        </button>

        {moreOpen && menuPos && createPortal(
          <div
            ref={moreMenuRef}
            style={{ position: 'fixed', top: `${menuPos.top}px`, left: `${menuPos.left}px`, width: `${menuPos.width}px`, zIndex: 9999 }}
            className="rounded-md border border-gray-200 bg-white shadow-lg"
            role="menu"
          >
            <div className="py-1">
              {extras.map(e => {
                const active = value === e.value;
                return (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => {
                      closeMenu();
                      pickExtra(e.value);
                    }}
                    className={
                      `block w-full text-left px-3 py-2 text-sm ` +
                      (active ? 'bg-blue-50 text-blue-800' : 'text-gray-700 hover:bg-gray-50')
                    }
                    role="menuitem"
                  >
                    {e.label}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
      </div>

      {(value === 'excused' || value === 'other') && (
        <input
          type="text"
          value={remarks || ''}
          onChange={(e) => onChangeRemarks(e.target.value)}
          placeholder={`Reason (optional, max ${reasonWordLimit} words)`}
          className="w-44 border rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );
}
