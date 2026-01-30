import React from 'react';

import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import Spinner from '../../../shared/components/feedback/Spinner.jsx';

export default function TransfersCandidatesTable({
	items,
	rows,
	meta,
	isLoading,
	canTransfer,
	sortBy,
	sortDir,
	onSort,
	openingId,
	candidatesCoreApplied,
	onOpen,
	onPage,
	onLimit,
}) {
	return (
		<StandardTable
			isLoading={isLoading}
			items={items}
			loadingMessage="Loading candidates..."
			loadingVariant="table"
			loadingRows={6}
			loadingColumns={8}
			emptyTitle={candidatesCoreApplied ? 'No candidates found' : 'Select filters to begin'}
			emptyDescription={
				candidatesCoreApplied
					? 'Try adjusting filters or search keyword.'
					: 'Choose Academic Year, Grade or Shift to load candidates.'
			}

			rows={rows}
			storageKey="transfers:candidates:columns:v1"
			sortBy={sortBy}
			sortDir={sortDir}
			onSort={onSort}
			columns={[
				{ key: 'studentId', label: 'Student ID', sortable: true, field: 'studentId' },
				{ key: 'fullName', label: 'Full Name', sortable: true, field: 'fullName', tdClassName: 'px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200' },
				{ key: 'academicYear', label: 'Academic Year', sortable: true, field: 'academicYear' },
				{ key: 'grade', label: 'Grade', sortable: true, field: 'grade' },
				{ key: 'section', label: 'Section', sortable: true, field: 'section' },
				{ key: 'shift', label: 'Shift', sortable: true, field: 'shift' },
				{ key: 'actions', label: 'Actions', align: 'right', noPrint: true, locked: false, tdClassName: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 border-x border-gray-200 no-print' },
			]}
			controlsProps={{
				limit: meta?.limit,
				total: meta?.total,
				onLimit: (v) => onLimit?.(v),
				limits: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 'all'],
			}}
			getRowKey={(st) => st._id}
			renderCell={(st, col) => {
				const le = st.latestEnrollment || {};
				const ayVal = st.academicYear || le.academicYear?.yearName || '';
				const gradeVal = st.grade || le.grade?.gradeName || le.gradeSection?.grade?.gradeName || '';
				const sectionVal = st.section ?? le.gradeSection?.section ?? null;
				const shiftVal = st.shift || le.shift?.shiftName || le.gradeSection?.shift?.shiftName || '';

				switch (col.key) {
					case 'studentId':
						return st.studentId || '-';
					case 'fullName':
						return st.fullName || '-';
					case 'academicYear':
						return ayVal || '-';
					case 'grade':
						return gradeVal || '-';
					case 'section':
						return sectionVal != null ? `Sec ${sectionVal}` : '-';
					case 'shift':
						return shiftVal || '-';
					case 'actions':
						return (
							<ActionButton
								variant="info"
								title="Transfer Section"
								onClick={() => onOpen?.(st)}
								disabled={!canTransfer || openingId === st._id}
							>
								{openingId === st._id ? (
									<>
										<Spinner size={14} color="currentColor" />
										<span>Opening…</span>
									</>
								) : (
									'Transfer'
								)}
							</ActionButton>
						);
					default:
						return '';
				}
			}}

			meta={meta}
			onPage={onPage}
			onLimit={onLimit}
			showRowsSelector={false}
		/>
	);
}
