import React from 'react';

const toneClassMap = {
	view: 'text-(--nb-color-accent) hover:text-(--nb-color-brand) hover:bg-(--nb-color-accent-50) focus:ring-(--nb-color-focus)',
	edit: 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 focus:ring-emerald-300',
	delete: 'text-red-700 hover:text-red-900 hover:bg-red-50 focus:ring-red-300',
	neutral: 'text-(--nb-color-muted) hover:text-(--nb-color-fg) hover:bg-(--nb-color-brand-50) focus:ring-(--nb-color-border)',
};

export default function RowActionButtons({ actions }) {
	if (!actions || actions.length === 0) return null;

	return (
		<div className="inline-flex items-center justify-end gap-1">
			{actions
				.filter(Boolean)
				.filter((a) => typeof a.onClick === 'function')
				.map((action) => {
					const tone = action.tone || 'neutral';
					const toneClasses = toneClassMap[tone] || toneClassMap.neutral;
					const disabled = Boolean(action.disabled);
					const showLabel = Boolean(action.showLabel);
					const borderByTone =
						tone === 'view'
								? 'border-(--nb-color-accent-200)'
							: tone === 'edit'
								? 'border-emerald-200'
								: tone === 'delete'
									? 'border-red-200'
									: 'border-(--nb-color-border)';

					return (
						<button
							key={action.key || action.label}
							type="button"
							onClick={disabled ? undefined : action.onClick}
							disabled={disabled}
							title={action.title || action.label}
							aria-label={action['aria-label'] || action.label}
							className={
								(showLabel
									? `inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 border ${borderByTone} bg-(--nb-color-bg-card) transition-colors `
									: 'inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ') +
								'focus:outline-none focus:ring-2 focus:ring-offset-2 ' +
								toneClasses +
								(disabled ? ' opacity-50 cursor-not-allowed' : '')
							}
						>
							{action.icon}
							{showLabel ? <span className="text-sm font-medium">{action.label}</span> : null}
						</button>
					);
				})}
		</div>
	);
}
