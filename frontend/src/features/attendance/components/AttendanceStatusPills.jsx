import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../../i18n/I18nProvider';

export default function AttendanceStatusPills({
  value,
  remarks,
  disabled = false,
  onChange,
  onChangeRemarks,
  onPickExcusedPreset,
  reasonWordLimit = 40,
}) {
  const { t } = useI18n();
  const showReasonInput = value === 'excused' || value === 'other';

  const opts = [
    { value: 'present', label: t('attendance.status.present') },
    { value: 'absent', label: t('attendance.status.absent') },
    { value: 'late', label: t('attendance.status.late') },
    { value: 'excused', label: t('attendance.status.excused') },
  ];

  const [moreOpen, setMoreOpen] = useState(false);
  const extras = [
    { value: 'sick', label: t('attendance.status.sick') },
    { value: 'medical', label: t('attendance.status.medicalAppointment') },
    { value: 'family', label: t('attendance.status.familyEmergency') },
    { value: 'other', label: t('attendance.status.other') },
  ];

  const extraValues = extras.map(e => e.value);
  const isExtraSelected = extraValues.includes(value);
  const selectedExtraLabel = isExtraSelected ? (extras.find(e => e.value === value)?.label || '') : '';

  // Keep old prop name for compatibility; now it picks an extra status.
  const pickExtra = (nextValue) => {
    // Primary: treat extras as real statuses (medical/family/sick/other)
    if (typeof onChange === 'function') onChange(nextValue);
    // Back-compat hook (older code used this to pick a preset reason)
    if (typeof onPickExcusedPreset === 'function') onPickExcusedPreset(nextValue);
  };

  const moreBtnRef = useRef(null);
  const moreMenuRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);

  const computePos = () => {
    const el = moreBtnRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const width = Math.min(240, Math.max(180, window.innerWidth - 16));
    const gap = 6;
    const top = r.bottom + gap;
    const leftPreferred = r.right - width;
    const left = Math.max(8, Math.min(leftPreferred, window.innerWidth - width - 8));
    return { top, left, width };
  };

  const closeMenu = () => setMoreOpen(false);

  const toggleMenu = () => {
    if (disabled) return;
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
    <div className="inline-flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="inline-flex rounded-md border border-gray-300 overflow-hidden bg-white flex-wrap">
        {opts.map((o, idx) => {
          const active = value === o.value;
          const isLast = idx === opts.length - 1;
          return (
            <div key={o.value} className="relative inline-flex">
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  onChange(o.value);
                }}
                className={
                  `px-2.5 py-1 text-xs font-medium ` +
                  (!isLast ? 'border-r border-gray-300 ' : '') +
                  (active
                    ? 'bg-(--nb-color-brand) text-white border-(--nb-color-brand)'
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
          aria-label={t('attendance.marking.moreStatusesAria')}
          disabled={disabled}
          onClick={toggleMenu}
          ref={moreBtnRef}
          className={
            `inline-flex items-center justify-center h-7 rounded-md border px-2 ` +
            (isExtraSelected
              ? 'border-(--nb-color-brand) bg-(--nb-color-brand) text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50') +
            (disabled ? ' opacity-60 cursor-not-allowed' : '')
          }
        >
          <span className="text-xs font-semibold">⋮</span>
          {isExtraSelected && (
            <span
              className="ml-1 text-xs font-medium whitespace-nowrap max-w-32 truncate"
              title={selectedExtraLabel}
            >
              {selectedExtraLabel}
            </span>
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
                      (active
                        ? 'bg-(--nb-color-brand) text-white'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900')
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

      {/* Reserve space for remarks input to prevent layout shift when toggling Excused/Other */}
      <input
        type="text"
        value={showReasonInput ? (remarks || '') : ''}
        disabled={disabled || !showReasonInput}
        tabIndex={showReasonInput ? 0 : -1}
        aria-hidden={!showReasonInput}
        onChange={(e) => {
          if (disabled || !showReasonInput) return;
          onChangeRemarks(e.target.value);
        }}
        placeholder={showReasonInput ? t('attendance.marking.reasonPlaceholder', { max: reasonWordLimit }) : ''}
        className={
          "w-full sm:w-44 border rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
          (disabled ? 'opacity-60 cursor-not-allowed' : '') +
          (!showReasonInput ? ' invisible pointer-events-none' : '')
        }
      />
    </div>
  );
}
