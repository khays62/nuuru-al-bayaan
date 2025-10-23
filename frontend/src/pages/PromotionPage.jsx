import React, { useEffect, useMemo, useState } from 'react';
import { Search, Play, Rocket, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Skeleton page for Promotions as a standalone tab per PROMOTION.md
// This wires the layout and UX elements; API integration to be added next.

const TimingSelector = ({ value, onChange }) => (
  <div className="flex items-center gap-3">
    <label className="font-medium">Timing</label>
    <select
      className="border rounded px-3 py-2 bg-white"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="mid-year">Mid-Year</option>
      <option value="year-end">Year-End</option>
    </select>
  </div>
);

export default function PromotionPage() {
  const [timing, setTiming] = useState('mid-year');
  const [filters, setFilters] = useState({ q: '', ay: '', grade: '', shift: '', section: '', cohort: '' });
  const [students, setStudents] = useState([]); // TODO: fetch from API with filters
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [preview, setPreview] = useState(null); // { items:[], summary:{} }
  const [autoCreate, setAutoCreate] = useState(true);
  const [loading, setLoading] = useState(false);

  const allSelected = useMemo(() => students.length > 0 && selectedIds.size === students.length, [students, selectedIds]);

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(students.map(s => s._id)));
  };

  const toggleSelected = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handlePreview = async () => {
    if (students.length === 0 || selectedIds.size === 0) {
      toast.error('Select at least one student to preview');
      return;
    }
    setLoading(true);
    try {
      // TODO: call GET /api/promotions/preview with { timing, studentIds: [...selectedIds] }
      // Mock response shape to validate UI layout
      const mock = {
        items: Array.from(selectedIds).map((id, i) => ({
          studentId: id,
          fromGS: { grade: 'Level 1', ay: '2025', section: 'A', shift: 'Morning', cohort: 'C1' },
          target: { toGrade: 'Level 2', toAY: timing === 'mid-year' ? '2025' : '2026', section: 'A', shift: 'Morning', cohort: 'C1' },
          toGS: i % 3 === 0 ? null : { _id: `gs-${i}` },
          action: i % 10 === 0 ? 'graduate' : 'promote',
          errors: [],
        })),
        summary: { total: selectedIds.size, promotable: selectedIds.size - 1, graduates: 1, missingTargets: Math.ceil(selectedIds.size / 3), capacityIssues: 0 },
      };
      setPreview(mock);
    } catch (err) {
      toast.error('Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!preview) { toast.error('Run preview first'); return; }
    setLoading(true);
    try {
      // TODO: POST /api/promotions/execute { timing, autoCreate, studentIds: [...selectedIds] }
      toast.success('Promotion executed (mock)');
      setPreview(null);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error('Promotion failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <TimingSelector value={timing} onChange={setTiming} />
          <input
            placeholder="Search students..."
            className="border rounded px-3 py-2 bg-white min-w-[220px]"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
          <select className="border rounded px-3 py-2 bg-white" value={filters.ay} onChange={(e)=>setFilters({...filters, ay:e.target.value})}>
            <option value="">AY</option>
            {/* TODO: populate AY options */}
          </select>
          <select className="border rounded px-3 py-2 bg-white" value={filters.grade} onChange={(e)=>setFilters({...filters, grade:e.target.value})}>
            <option value="">Grade</option>
          </select>
          <select className="border rounded px-3 py-2 bg-white" value={filters.shift} onChange={(e)=>setFilters({...filters, shift:e.target.value})}>
            <option value="">Shift</option>
          </select>
          <select className="border rounded px-3 py-2 bg-white" value={filters.section} onChange={(e)=>setFilters({...filters, section:e.target.value})}>
            <option value="">Section</option>
          </select>
          <select className="border rounded px-3 py-2 bg-white" value={filters.cohort} onChange={(e)=>setFilters({...filters, cohort:e.target.value})}>
            <option value="">Cohort</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePreview} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            <Play size={16}/> Preview
          </button>
          <button onClick={handlePromote} disabled={!preview} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded disabled:opacity-50">
            <Rocket size={16}/> Promote
          </button>
          <button onClick={()=>setPreview(null)} className="inline-flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-900 px-3 py-2 rounded">
            <RefreshCw size={16}/> Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Students table */}
        <div className="bg-white rounded shadow p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Students</h3>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              <span>Select All</span>
            </label>
          </div>
          <div className="border rounded overflow-auto max-h-[520px]">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2"></th>
                  <th className="p-2 text-left">Student</th>
                  <th className="p-2 text-left">Current</th>
                  <th className="p-2 text-left">Cohort</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 && (
                  <tr><td colSpan={4} className="p-4 text-center text-gray-500">No students loaded (connect API)</td></tr>
                )}
                {students.map(s => (
                  <tr key={s._id} className="border-t">
                    <td className="p-2"><input type="checkbox" checked={selectedIds.has(s._id)} onChange={()=>toggleSelected(s._id)} /></td>
                    <td className="p-2">{s.studentId} — {s.fullName}</td>
                    <td className="p-2">{s.current?.ay} • {s.current?.grade} • {s.current?.section} • {s.current?.shift}</td>
                    <td className="p-2"><span className="inline-block text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded">{s.current?.cohort || '-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Preview panel */}
        <div className="bg-white rounded shadow p-3">
          <h3 className="font-semibold mb-2">Preview</h3>
          {!preview ? (
            <div className="text-gray-500">Run Preview to see targets, auto-create needs, and graduations</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <div>Total: <b>{preview.summary.total}</b></div>
                <div>Promotable: <b className="text-emerald-700">{preview.summary.promotable}</b></div>
                <div>Graduates: <b className="text-blue-700">{preview.summary.graduates}</b></div>
                <div>Missing Targets: <b className="text-amber-700">{preview.summary.missingTargets}</b></div>
                <div>Capacity Issues: <b className="text-red-700">{preview.summary.capacityIssues}</b></div>
                <label className="ml-auto inline-flex items-center gap-2">
                  <input type="checkbox" checked={autoCreate} onChange={(e)=>setAutoCreate(e.target.checked)} />
                  <span className="text-sm">Auto-create GS</span>
                </label>
              </div>
              <div className="border rounded max-h-[520px] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Student</th>
                      <th className="p-2 text-left">From</th>
                      <th className="p-2 text-left">To</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((it, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{it.studentId}</td>
                        <td className="p-2">{it.fromGS.grade} • {it.fromGS.ay} • {it.fromGS.section} • {it.fromGS.shift} • {it.fromGS.cohort}</td>
                        <td className="p-2">{it.target.toGrade} • {it.target.toAY} • {it.target.section} • {it.target.shift} • {it.target.cohort}</td>
                        <td className="p-2">
                          {it.action === 'graduate' ? (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">Graduate</span>
                          ) : !it.toGS ? (
                            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">Missing GS</span>
                          ) : (
                            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
