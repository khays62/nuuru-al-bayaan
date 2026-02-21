// Simple table wrapper to replace missing component
// Adapts to StandardTable usage or provides basic rendering
export default function Table({ columns, data, rows }) {
    const tableData = data || rows || [];
    
    return (
        <div className="overflow-x-auto border border-(--nb-color-border) rounded-(--nb-radius-md) bg-(--nb-color-bg-card)">
            <table className="min-w-full divide-y divide-(--nb-color-border)">
                <thead className="bg-(--nb-color-brand)">
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={idx} className="px-6 py-3 text-left text-xs font-black text-white uppercase tracking-wider">
                                {col.header || col.Header || col.title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-(--nb-color-bg-card) divide-y divide-(--nb-color-border)">
                    {tableData.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="px-6 py-4 text-center text-sm text-(--nb-color-muted)">
                                No data found
                            </td>
                        </tr>
                    ) : (
                        tableData.map((row, rowIdx) => (
                            <tr key={row.id || row._id || rowIdx} className="hover:bg-(--nb-color-brand-50)">
                                {columns.map((col, colIdx) => {
                                    const cellData = row[col.accessorKey || col.accessor];
                                    return (
                                        <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-(--nb-color-fg)">
                                            {col.cell 
                                                ? col.cell({ row: { original: row }, getValue: () => cellData }) 
                                                : cellData
                                            }
                                        </td>
                                    );
                                })}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
