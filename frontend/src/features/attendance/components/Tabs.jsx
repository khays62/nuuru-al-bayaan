export default function Tabs({ value, options, onChange, className = '', tone = 'gray' }) {
  const stylesByTone = {
    gray: {
      container: 'border-(--nb-color-border) bg-(--nb-color-bg-card)',
      active: 'bg-(--nb-color-brand) text-white border-(--nb-color-brand)',
      inactive: 'bg-(--nb-color-bg-card) text-(--nb-color-text) border-(--nb-color-border) hover:bg-(--nb-color-bg)',
    },
    blue: {
      container: 'border-(--nb-color-brand-200) bg-(--nb-color-brand-50) shadow-sm',
      active: 'bg-(--nb-color-brand) text-white border-(--nb-color-brand)',
      inactive: 'bg-(--nb-color-brand-50) text-(--nb-color-brand) border-(--nb-color-brand-200) hover:bg-(--nb-color-brand-100)',
    },
  };

  const toneStyles = stylesByTone[tone] || stylesByTone.gray;
  return (
    <div className={`inline-flex rounded-md border overflow-hidden ${toneStyles.container} ${className}`}>
      {options.map((opt) => {
        const active = value === opt.value;
        const disabled = Boolean(opt.disabled);
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) {
                if (typeof opt.onDisabledClick === 'function') opt.onDisabledClick();
                return;
              }
              onChange(opt.value);
            }}
            className={
              `px-4 py-2 text-base font-medium border-r last:border-r-0 ` +
              (active
                ? toneStyles.active
                : toneStyles.inactive) +
              (disabled ? ' opacity-50 cursor-not-allowed hover:bg-(--nb-color-bg-card)' : '')
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
