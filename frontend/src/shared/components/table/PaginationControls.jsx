// PaginationControls.jsx
// Maareynta bogagga: Prev/Next + tirada rows per page.
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Select from '../ui/Select.jsx';
import { useI18n } from '../../../i18n/I18nProvider';

function buildPageItems(_current, total) {
	const totalPages = Math.max(1, Number(total) || 1);

	// Per UX request: if pages are many, show: 1 2 3 4 ... (last-1) last
	if (totalPages <= 6) {
		return Array.from({ length: totalPages }, (_, i) => i + 1);
	}
	return [1, 2, 3, 4, '…', totalPages - 1, totalPages];
}

export default function PaginationControls({
	page,
	totalPages,
	limit,
	total,
	onPage,
	onLimit,
	limits = [5, 10, 20, 50],
	className = '',
	showRowsSelector = true,
	infoVariant = 'auto', // 'auto' | 'range' | 'page'
}) {
	const { t } = useI18n();
	const p = Math.max(1, Number(page) || 1);
	const tp = Math.max(1, Number(totalPages) || 1);
	const lim = Math.max(1, Number(limit) || 10);
	const tot = total == null ? null : Math.max(0, Number(total) || 0);

	const [uiPage, setUiPage] = React.useState(p);
	React.useEffect(() => { setUiPage(p); }, [p]);

	const effectivePage = Math.min(tp, Math.max(1, Number(uiPage) || 1));
	const start = tot != null && tot > 0 ? (effectivePage - 1) * lim + 1 : null;
	const end = tot != null && tot > 0 ? Math.min(effectivePage * lim, tot) : null;
	const items = buildPageItems(effectivePage, tp);

	const hasAll = Array.isArray(limits) && limits.some((v) => String(v).toLowerCase() === 'all');
	const [allSelected, setAllSelected] = React.useState(false);

	React.useEffect(() => {
		if (!hasAll) { setAllSelected(false); return; }
		if (tot == null || tot <= 0) { setAllSelected(false); return; }
		if (lim !== tot) setAllSelected(false);
	}, [hasAll, lim, tot]);

	const selectValue = allSelected ? 'all' : String(lim);

	return (
		<div className={`flex items-center gap-3 flex-wrap mt-4 ${className}`}>
			<div className="inline-flex items-stretch rounded-md border border-(--nb-color-border) overflow-hidden shadow-sm bg-(--nb-color-bg-card)">
				<button
					type="button"
					disabled={effectivePage <= 1}
					onClick={() => {
						const next = effectivePage - 1;
						setUiPage(next);
						onPage(next);
					}}
					className="px-3 py-2 text-sm text-(--nb-color-brand) hover:bg-(--nb-color-brand-50) disabled:opacity-50 disabled:cursor-not-allowed border-r border-(--nb-color-border)"
					aria-label={t('common.previous', { defaultValue: 'Previous' })}
					title={t('common.previous', { defaultValue: 'Previous' })}
				>
					<ChevronLeft size={18} />
				</button>

				{items.map((it, idx) => {
					if (it === '…') {
						return (
							<span
								key={`ellipsis-${idx}`}
								className="px-3 py-2 text-sm text-(--nb-color-brand) select-none border-r border-(--nb-color-border) flex items-center"
							>
								…
							</span>
						);
					}
					const num = Number(it);
					const active = num === effectivePage;
					return (
						<button
							key={num}
							type="button"
							onClick={() => {
								setUiPage(num);
								onPage(num);
							}}
							className={
								'min-w-9 px-3 py-2 text-sm border-r border-(--nb-color-border) ' +
								(active
									? 'bg-(--nb-color-brand) text-white'
									: 'bg-(--nb-color-bg-card) text-(--nb-color-brand) hover:bg-(--nb-color-brand-50)')
							}
							aria-current={active ? 'page' : undefined}
						>
							{num}
						</button>
					);
				})}

				<button
					type="button"
					disabled={effectivePage >= tp}
					onClick={() => {
						const next = effectivePage + 1;
						setUiPage(next);
						onPage(next);
					}}
					className="px-3 py-2 text-sm text-(--nb-color-brand) hover:bg-(--nb-color-brand-50) disabled:opacity-50 disabled:cursor-not-allowed"
					aria-label={t('common.next', { defaultValue: 'Next' })}
					title={t('common.next', { defaultValue: 'Next' })}
				>
					<ChevronRight size={18} />
				</button>
			</div>

			<div className="ml-auto flex items-center gap-3 text-sm text-(--nb-color-fg)">
				<div className="hidden sm:block text-(--nb-color-muted)">
					{infoVariant === 'range' ? (
						start != null && end != null ? (
							<span>
								{t('common.showing', { defaultValue: 'Showing' })}{' '}
								<span className="font-medium text-(--nb-color-fg)">{start}–{end}</span>{' '}
								{t('common.of', { defaultValue: 'of' })}{' '}
								<span className="font-medium text-(--nb-color-fg)">{tot}</span>{' '}
								{t('common.rows', { defaultValue: 'Rows' })}
							</span>
						) : (
							<span>
								{t('common.page', { defaultValue: 'Page' })}{' '}
								<span className="font-medium text-(--nb-color-fg)">{effectivePage}</span>{' '}
								{t('common.of', { defaultValue: 'of' })}{' '}
								<span className="font-medium text-(--nb-color-fg)">{tp}</span>
							</span>
						)
					) : infoVariant === 'page' ? (
						<span>
							{t('common.page', { defaultValue: 'Page' })}{' '}
							<span className="font-medium text-(--nb-color-fg)">{effectivePage}</span>{' '}
							{t('common.of', { defaultValue: 'of' })}{' '}
							<span className="font-medium text-(--nb-color-fg)">{tp}</span>
							{tot != null ? (
								<>
									{' '}
									— <span className="font-medium text-(--nb-color-fg)">{tot}</span> {t('common.total', { defaultValue: 'total' })}
								</>
							) : null}
						</span>
					) : (
						start != null && end != null ? (
							<span>
								{t('common.showing', { defaultValue: 'Showing' })}{' '}
								<span className="font-medium text-(--nb-color-fg)">{start}–{end}</span>{' '}
								{t('common.of', { defaultValue: 'of' })}{' '}
								<span className="font-medium text-(--nb-color-fg)">{tot}</span>
							</span>
						) : (
							<span>
								{t('common.page', { defaultValue: 'Page' })}{' '}
								<span className="font-medium text-(--nb-color-fg)">{effectivePage}</span>{' '}
								{t('common.of', { defaultValue: 'of' })}{' '}
								<span className="font-medium text-(--nb-color-fg)">{tp}</span>
							</span>
						)
					)}
				</div>

				{showRowsSelector ? (
					<div className="flex items-center gap-2">
						<span className="text-(--nb-color-muted)">{t('common.rows', { defaultValue: 'Rows' })}</span>
						<Select
							value={selectValue}
							onChange={(e) => {
								const v = e.target.value;
								if (String(v).toLowerCase() === 'all') {
									const allLimit = tot != null && tot > 0 ? tot : 1000;
									setAllSelected(true);
									onLimit(allLimit);
									return;
								}
								setAllSelected(false);
								onLimit(parseInt(v, 10));
							}}
							className="w-auto px-2 py-1.5"
						>
							{limits.map((l) => (
								<option key={String(l)} value={String(l).toLowerCase() === 'all' ? 'all' : l}>
									{String(l).toLowerCase() === 'all' ? t('common.all', { defaultValue: 'All' }) : l}
								</option>
							))}
						</Select>
					</div>
				) : null}
			</div>
		</div>
	);
}
