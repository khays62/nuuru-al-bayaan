import React from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { useI18n } from '../../../i18n/I18nProvider';

export default function SortableTh({
	label,
	field,
	sortBy,
	sortDir,
	onSort,
	baseClassName = '',
	className = '',
	align = 'left',
}) {
	const { t } = useI18n();
	const active = String(sortBy || '') === String(field || '');
	const dir = String(sortDir || '').toLowerCase() === 'asc' ? 'asc' : 'desc';

	const Icon = !active ? ChevronsUpDown : (dir === 'asc' ? ChevronUp : ChevronDown);

	return (
		<th
			scope="col"
			className={
				(baseClassName
					? `${baseClassName} ${className}`
					: (
						`px-6 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-white/20 ` +
						(align === 'right' ? 'text-right ' : 'text-left ') +
						className
					)
				).trim()
			}
		>
			<button
				type="button"
				onClick={() => onSort?.(field)}
					className="inline-flex items-center gap-1.5 hover:opacity-90 active:opacity-80 select-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nb-color-brand) focus-visible:ring-offset-0 rounded-sm"
				title={`${t('common.sortBy', { defaultValue: 'Sort by' })} ${label}`}
			>
				<span>{label}</span>
				<Icon size={14} className={active ? 'opacity-100' : 'opacity-60'} />
			</button>
		</th>
	);
}
