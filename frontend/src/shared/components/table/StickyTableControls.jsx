import React, { useEffect, useState } from 'react';
import ColumnVisibilityMenu from './ColumnVisibilityMenu.jsx';
import DropdownSelect from '../ui/DropdownSelect.jsx';
import { useI18n } from '../../../i18n/useI18n';

export default function StickyTableControls({
	columns = [],
	visible = {},
	onToggle,
	limit,
	total,
	onLimit,
	limits = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 'all'],
	showRows = true,
	showColumns = true,
	className = '',
}) {
	const { t } = useI18n();
	const tot = total == null ? null : Math.max(0, Number(total) || 0);
	const lim = Math.max(1, Number(limit) || 10);

	const hasAll = Array.isArray(limits) && limits.some((v) => String(v).toLowerCase() === 'all');
	const [allSelected, setAllSelected] = useState(false);

	useEffect(() => {
		if (!hasAll) { setAllSelected(false); return; }
		if (tot == null || tot <= 0) { setAllSelected(false); return; }
		if (lim !== tot) setAllSelected(false);
	}, [hasAll, lim, tot]);

	const selectValue = allSelected ? 'all' : String(lim);

	const rowLimitOptions = (limits || []).map((v) => {
		const raw = String(v);
		const isAll = raw.toLowerCase() === 'all';
		return { value: isAll ? 'all' : raw, label: isAll ? t('common.all', { defaultValue: 'All' }) : raw };
	});

	return (
		<div className={`no-print sticky top-0 z-20 bg-(--nb-color-bg-card) pt-2 pb-2 border-b border-(--nb-color-border) ${className}`.trim()}>
			<div className="flex items-center justify-between gap-3 flex-wrap">
				{showRows ? (
					<div className="flex items-center gap-2 flex-wrap text-sm text-(--nb-color-fg)">
							<span className="text-(--nb-color-muted)">{t('common.rows', { defaultValue: 'Rows' })}</span>
						<div className="min-w-24">
							<DropdownSelect
								value={selectValue}
								onChange={(v) => {
									if (String(v).toLowerCase() === 'all') {
										const allLimit = tot != null && tot > 0 ? tot : 1000;
										setAllSelected(true);
										onLimit?.(allLimit);
										return;
									}
									setAllSelected(false);
									const next = parseInt(String(v), 10);
									if (!Number.isFinite(next)) return;
									onLimit?.(next);
								}}
								options={rowLimitOptions}
								placeholder={t('common.rows', { defaultValue: 'Rows' })}
								clearable={false}
								hideSelectedOption={false}
								className="w-auto"
							/>
						</div>
					</div>
				) : (
					<div />
				)}

				{showColumns ? (
					<ColumnVisibilityMenu columns={columns} visible={visible} onToggle={onToggle} />
				) : null}
			</div>
		</div>
	);
}
