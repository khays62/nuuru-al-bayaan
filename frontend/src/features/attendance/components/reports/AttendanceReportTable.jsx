import StandardTable from '../../../../shared/components/table/StandardTable.jsx';
import { useI18n } from '../../../../i18n/I18nProvider';

function SkeletonCell({ wClass = 'w-24' }) {
  return (
    <div className={`h-4 ${wClass} rounded bg-(--nb-color-bg)`} />
  );
}

export default function AttendanceReportTable({
  columns,
  headerRows,
  rows,
  loading,
  emptyMessage,
  skeletonRows = 6,
}) {
  const { t } = useI18n();
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  const colCount = safeColumns.length || 1;
  const safeHeaderRows = Array.isArray(headerRows) ? headerRows : null;

  return (
    <StandardTable
      isLoading={false}
      error={null}
      items={['__attendance_report__']}
      isEmpty={false}
      rows={[]}
      columns={[]}
      tableProps={{
        theadClassName: 'bg-(--nb-color-brand)',
        tbodyClassName: `divide-y divide-(--nb-color-border) ${loading ? 'animate-pulse' : ''}`,
        useDefaultHeaderStyles: false,
        renderHeader: () => (
          <>
            {safeHeaderRows ? (
              safeHeaderRows.map((row, rIdx) => (
                <tr key={`hr-${rIdx}`}>
                  {(Array.isArray(row) ? row : []).map((cell) => (
                    <th
                      key={cell?.key || `${rIdx}-${String(cell?.label || '')}`}
                      colSpan={cell?.colSpan || 1}
                      rowSpan={cell?.rowSpan || 1}
                      className={
                        'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border) ' +
                        (cell?.className || '')
                      }
                    >
                      {cell?.label}
                    </th>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                {safeColumns.map((c) => (
                  <th
                    key={c.key}
                    className={
                      'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border) ' +
                      (c.headerClassName || '')
                    }
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            )}
          </>
        ),
        renderBody: () => (
          <>
            {loading && Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={`sk-${i}`} className="odd:bg-(--nb-color-bg-card) even:bg-(--nb-color-bg)">
                {safeColumns.map((c) => (
                  <td key={`${c.key}-sk-${i}`} className="px-6 py-4 border-x border-(--nb-color-border)">
                    <SkeletonCell wClass={c.skeletonClassName || 'w-24'} />
                  </td>
                ))}
              </tr>
            ))}

            {!loading && safeRows.length === 0 && (
              <tr>
                <td className="px-6 py-4 text-sm text-(--nb-color-muted)" colSpan={colCount}>
                  {emptyMessage || t('common.emptyStates.noDataFound')}
                </td>
              </tr>
            )}

            {!loading && safeRows.length > 0 && safeRows.map((row, idx) => (
              <tr key={row?._id || row?.id || `${idx}`} className="odd:bg-(--nb-color-bg-card) even:bg-(--nb-color-bg) hover:bg-(--nb-color-bg-card) transition-colors">
                {safeColumns.map((c) => (
                  <td
                    key={`${c.key}-${idx}`}
                    className={
                      'px-6 py-4 text-sm text-(--nb-color-fg) border-x border-(--nb-color-border) ' +
                      (c.cellClassName || '')
                    }
                  >
                    {typeof c.render === 'function' ? c.render(row) : (row?.[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </>
        ),
      }}
    />
  );
}
