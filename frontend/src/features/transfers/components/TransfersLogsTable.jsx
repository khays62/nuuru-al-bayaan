import React from 'react';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';

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
	return (
		<StandardTable
			isLoading={isLoading}
			items={items}
			loadingMessage="Loading transfers..."
			loadingVariant="table"
			loadingRows={6}
			loadingColumns={6}
			emptyTitle="No transfers found"
			emptyDescription="Transfers will appear here when recorded."

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
				{ key: 'date', label: 'Date', sortable: true, field: 'date' },
				{ key: 'student', label: 'Student', sortable: true, field: 'student', tdClassName: 'px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200' },
				{ key: 'from', label: 'From', sortable: true, field: 'from' },
				{ key: 'to', label: 'To', sortable: true, field: 'to' },
				{ key: 'type', label: 'Type', sortable: true, field: 'type' },
				{ key: 'reason', label: 'Reason', sortable: true, field: 'reason' },
			]}
			getRowKey={(l) => l._id}
			renderCell={(l, col) => {
				const dateStr = l.date ? new Date(l.date).toLocaleString() : '';
				const fromLbl = [l.from?.grade, (l.from?.section != null ? `Sec ${l.from.section}` : null), (l.from?.shift ? `(${l.from.shift})` : null)]
					.filter(Boolean)
					.join(' ');
				const toLbl = [l.to?.grade, (l.to?.section != null ? `Sec ${l.to.section}` : null), (l.to?.shift ? `(${l.to.shift})` : null)]
					.filter(Boolean)
					.join(' ');
				const type = l.revertOf ? 'Revert' : 'Transfer';

				switch (col.key) {
					case 'date':
						return dateStr;
					case 'student':
						return (
							<>
								{l.student?.fullName || '-'} <span className="text-gray-500">({l.student?.studentId || ''})</span>
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
