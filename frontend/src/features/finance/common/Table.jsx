// Simple table wrapper to replace missing component
// Adapts to StandardTable usage or provides basic rendering
export default function Table({ columns, data, rows }) {
    const tableData = data || rows || [];
    
    return (
        <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={idx} className="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">
                                {col.header || col.Header || col.title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {tableData.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="px-6 py-4 text-center text-sm text-gray-500">
                                No data found
                            </td>
                        </tr>
                    ) : (
                        tableData.map((row, rowIdx) => (
                            <tr key={row.id || row._id || rowIdx} className="hover:bg-gray-50">
                                {columns.map((col, colIdx) => {
                                    const cellData = row[col.accessorKey || col.accessor];
                                    return (
                                        <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
