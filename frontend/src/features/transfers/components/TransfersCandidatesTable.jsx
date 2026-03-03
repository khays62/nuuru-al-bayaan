import React from 'react';

import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import Spinner from '../../../shared/components/feedback/Spinner.jsx';
import { useI18n } from '../../../i18n/useI18n';

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
	const { t } = useI18n();
	const sectionPrefix = t('common.sectionPrefix', { defaultValue: 'Sec' });

	return (
		<StandardTable
			isLoading={isLoading}
			items={items}
			loadingMessage={t('transfers.candidates.loading', { defaultValue: 'Loading candidates...' })}
			loadingVariant="table"
			loadingRows={6}
			loadingColumns={8}
			emptyTitle={candidatesCoreApplied
				? t('transfers.candidates.emptyTitleNone', { defaultValue: 'No candidates found' })
				: t('transfers.candidates.emptyTitleNeedsFilters', { defaultValue: 'Select filters to begin' })
			}
			emptyDescription={
				candidatesCoreApplied
					? t('transfers.candidates.emptyDescriptionNone', { defaultValue: 'Try adjusting filters or search keyword.' })
					: t('transfers.candidates.emptyDescriptionNeedsFilters', { defaultValue: 'Choose Academic Year, Grade or Shift to load candidates.' })
			}

			rows={rows}
			storageKey="transfers:candidates:columns:v1"
			sortBy={sortBy}
			sortDir={sortDir}
			onSort={onSort}
			columns={[
				{ key: 'studentId', label: t('transfers.candidates.columns.studentId', { defaultValue: 'Student ID' }), sortable: true, field: 'studentId' },
				{ key: 'fullName', label: t('transfers.candidates.columns.fullName', { defaultValue: 'Full Name' }), sortable: true, field: 'fullName' },
				{ key: 'academicYear', label: t('common.filters.academicYear', { defaultValue: 'Academic Year' }), sortable: true, field: 'academicYear' },
				{ key: 'grade', label: t('common.filters.grade', { defaultValue: 'Grade' }), sortable: true, field: 'grade' },
				{ key: 'section', label: t('common.filters.section', { defaultValue: 'Section' }), sortable: true, field: 'section' },
				{ key: 'shift', label: t('common.filters.shift', { defaultValue: 'Shift' }), sortable: true, field: 'shift' },
				{ key: 'actions', label: t('common.table.actions', { defaultValue: 'Actions' }), align: 'right', noPrint: true, locked: false, tdClassName: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 border-x border-(--nb-color-border) no-print' },
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
						return sectionVal != null ? `${sectionPrefix} ${sectionVal}` : '-';
					case 'shift':
						return shiftVal || '-';
					case 'actions':
						return (
							<ActionButton
								variant="info"
								title={t('transfers.actions.transferSectionTitle', { defaultValue: 'Transfer Section' })}
								onClick={() => onOpen?.(st)}
								disabled={!canTransfer || openingId === st._id}
							>
								{openingId === st._id ? (
									<>
										<Spinner size={14} color="currentColor" />
										<span>{t('transfers.actions.opening', { defaultValue: 'Openingâ€¦' })}</span>
									</>
								) : (
									t('common.actions.transfer', { defaultValue: 'Transfer' })
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
