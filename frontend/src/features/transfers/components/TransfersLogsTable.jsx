import React from 'react';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import { useI18n } from '../../../i18n/useI18n';

export default function TransfersLogsTable({
	items,
	rows,
	meta,
	isLoading,
	sortBy,
	sortDir,
	onSort,
	onPage,
	onLimit,
}) {
	const { t } = useI18n();
	const sectionPrefix = t('common.sectionPrefix', { defaultValue: 'Sec' });

	return (
		<StandardTable
			isLoading={isLoading}
			items={items}
			loadingMessage={t('transfers.logs.loading', { defaultValue: 'Loading transfers...' })}
			loadingVariant="table"
			loadingRows={6}
			loadingColumns={6}
			emptyTitle={t('transfers.logs.emptyTitle', { defaultValue: 'No transfers found' })}
			emptyDescription={t('transfers.logs.emptyDescription', { defaultValue: 'Transfers will appear here when recorded.' })}

			rows={rows}
			storageKey="transfers:logs:columns:v1"
			sortBy={sortBy}
			sortDir={sortDir}
			onSort={onSort}
			controlsProps={{
				limit: meta?.limit,
				total: meta?.total,
				onLimit: (v) => onLimit?.(v),
				limits: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 'all'],
			}}
			columns={[
				{ key: 'date', label: t('transfers.logs.columns.date', { defaultValue: 'Date' }), sortable: true, field: 'date' },
				{ key: 'student', label: t('transfers.logs.columns.student', { defaultValue: 'Student' }), sortable: true, field: 'student' },
				{ key: 'from', label: t('transfers.logs.columns.from', { defaultValue: 'From' }), sortable: true, field: 'from' },
				{ key: 'to', label: t('transfers.logs.columns.to', { defaultValue: 'To' }), sortable: true, field: 'to' },
				{ key: 'type', label: t('transfers.logs.columns.type', { defaultValue: 'Type' }), sortable: true, field: 'type' },
				{ key: 'reason', label: t('transfers.logs.columns.reason', { defaultValue: 'Reason' }), sortable: true, field: 'reason' },
			]}
			getRowKey={(l) => l._id}
			renderCell={(l, col) => {
				const dateStr = l.date ? new Date(l.date).toLocaleString() : '';
				const fromLbl = [l.from?.grade, (l.from?.section != null ? `${sectionPrefix} ${l.from.section}` : null), (l.from?.shift ? `(${l.from.shift})` : null)]
					.filter(Boolean)
					.join(' ');
				const toLbl = [l.to?.grade, (l.to?.section != null ? `${sectionPrefix} ${l.to.section}` : null), (l.to?.shift ? `(${l.to.shift})` : null)]
					.filter(Boolean)
					.join(' ');
				const type = l.revertOf
					? t('transfers.logs.type.revert', { defaultValue: 'Revert' })
					: t('transfers.logs.type.transfer', { defaultValue: 'Transfer' });

				switch (col.key) {
					case 'date':
						return dateStr;
					case 'student':
						return (
							<>
								{l.student?.fullName || '-'}{' '}
								<span className="text-(--nb-color-muted)">({l.student?.studentId || ''})</span>
							</>
						);
					case 'from':
						return fromLbl || '-';
					case 'to':
						return toLbl || '-';
					case 'type':
						return type;
					case 'reason':
						return l.reason || '';
					default:
						return '';
				}
			}}

			meta={meta}
			onPage={onPage}
			onLimit={onLimit}
			showRowsSelector={false}
			paginationProps={{ className: 'mt-3' }}
		/>
	);
}
