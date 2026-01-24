import React, { useEffect, useState } from 'react';
import ColumnVisibilityMenu from './ColumnVisibilityMenu.jsx';

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

	return (
		<div className={`no-print sticky top-0 z-20 bg-white pt-2 pb-2 border-b border-gray-200 ${className}`.trim()}>
			<div className="flex items-center justify-between gap-3">
				{showRows ? (
					<div className="flex items-center gap-2 text-sm text-slate-700">
						<span className="text-slate-600">Rows</span>
						<select
							value={selectValue}
							onChange={(e) => {
								const v = e.target.value;
								if (String(v).toLowerCase() === 'all') {
									const allLimit = tot != null && tot > 0 ? tot : 1000;
									setAllSelected(true);
									onLimit?.(allLimit);
									return;
								}
								setAllSelected(false);
								const next = parseInt(v, 10);
								if (!Number.isFinite(next)) return;
								onLimit?.(next);
							}}
							className="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
						>
							{(limits || []).map((v) => (
								<option key={String(v)} value={String(v).toLowerCase() === 'all' ? 'all' : v}>
									{String(v).toLowerCase() === 'all' ? 'All' : v}
								</option>
							))}
						</select>
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
