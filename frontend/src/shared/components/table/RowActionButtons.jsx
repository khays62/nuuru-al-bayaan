import React from 'react';

const toneClassMap = {
	view: 'text-blue-700 hover:text-blue-900 hover:bg-blue-50 focus:ring-blue-300',
	edit: 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 focus:ring-emerald-300',
	delete: 'text-red-700 hover:text-red-900 hover:bg-red-50 focus:ring-red-300',
	neutral: 'text-slate-700 hover:text-slate-900 hover:bg-slate-50 focus:ring-slate-300',
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
							? 'border-blue-200'
							: tone === 'edit'
								? 'border-emerald-200'
								: tone === 'delete'
									? 'border-red-200'
									: 'border-slate-200';

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
									? `inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 border ${borderByTone} bg-white transition-colors `
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
