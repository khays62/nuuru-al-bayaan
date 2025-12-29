export default function Tabs({ value, options, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-md border border-gray-300 overflow-hidden bg-white ${className}`}>
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
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50') +
              (disabled ? ' opacity-50 cursor-not-allowed hover:bg-white' : '')
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
