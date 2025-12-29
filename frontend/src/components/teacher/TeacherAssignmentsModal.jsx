import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import Modal from '../common/Modal';
import ActionButton from '../common/ActionButton';
import { getGrades, getShifts } from '../../api/modules/lookups';
import { listGradeSections } from '../../api/modules/gradeSections';
import { getSubjects } from '../../api/modules/subjects';
import { addAssignment, getAssignments, removeAssignment } from '../../api/modules/teachers';
import FilterSelect from '../common/DataToolbar/FilterSelect';

export default function TeacherAssignmentsModal({ isOpen, onClose, teacher, canAssign = false }) {
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState([]);
  const [gradeId, setGradeId] = useState('');
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState('');
  const [shifts, setShifts] = useState([]);
  const [shiftId, setShiftId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [active, setActive] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setLoading(true);
    Promise.all([
      getGrades(),
      getShifts(),
      getAssignments(teacher._id)
    ]).then(([gradesData, shiftsData, aData]) => {
      const g = Array.isArray(gradesData?.data) ? gradesData.data : gradesData;
      const sortedG = Array.isArray(g) ? [...g].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) : [];
      setGrades(sortedG);
      const sh = Array.isArray(shiftsData?.data) ? shiftsData.data : shiftsData;
      setShifts(sh || []);
      const a = Array.isArray(aData?.data) ? aData.data : (Array.isArray(aData) ? aData : []);
      setAssignments(a);
    }).catch(() => setError('Failed to load data')).finally(() => setLoading(false));
  }, [isOpen, teacher?._id]);

  useEffect(() => {
    if (!gradeId) { setSections([]); setSectionId(''); setSubjects([]); setSubjectId(''); return; }
    (async () => {
      try {
        setLoading(true);
        const params = { grade: gradeId, limit: 100 };
        if (shiftId) params.shift = shiftId;
        const [secRes, subjRes] = await Promise.all([
          listGradeSections(params),
          getSubjects({ grade: gradeId, limit: 100 })
        ]);
        setSections(secRes?.data || []);
        setSubjects(subjRes?.data || []);
      } catch (e) {
        setError('Failed to load sections/subjects');
      } finally {
        setLoading(false);
      }
    })();
  }, [gradeId, shiftId]);

  const canAdd = useMemo(() => !!(sectionId && subjectId), [sectionId, subjectId]);

  const onAdd = async () => {
    if (!canAssign) {
      toast.error('You do not have permission to edit teacher assignments', { position: 'top-center' });
      return;
    }
    if (!canAdd || submitting) return;
    setSubmitting(true);
    try {
      await addAssignment(teacher._id, { gsId: sectionId, subjectId, role: 'main' });
      toast.success('Assignment added', { position: 'top-center' });
      // Refresh list
      const aData = await getAssignments(teacher._id);
      const a = Array.isArray(aData?.data) ? aData.data : (Array.isArray(aData) ? aData : []);
      setAssignments(a);
      // Clear selects to avoid duplicate accidental repeat
      setGradeId('');
      setShiftId('');
      setSectionId('');
      setSubjectId('');
    } catch (e) {
      const msg = e?.message || 'Failed to add assignment';
      toast.error(msg, { position: 'top-center' });
    } finally {
      setSubmitting(false);
    }
  };

  const onRemove = async (assignment) => {
    if (!canAssign) {
      toast.error('You do not have permission to edit teacher assignments', { position: 'top-center' });
      return;
    }
    if (!confirm('Remove this assignment?')) return;
    try {
      await removeAssignment(teacher._id, assignment._id);
      setAssignments((prev) => prev.filter((x) => x._id !== assignment._id));
    } catch (e) {
      alert(e.message || 'Failed to remove');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assignments • ${teacher?.fullName || teacher?.teacherId || ''}`}>
      <div className="space-y-4">
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <FilterSelect value={gradeId} onChange={setGradeId} options={(grades||[]).map(g => ({ value: g._id, label: g.gradeName }))} placeholder="Select level…" />
          </div>
          <div>
            <FilterSelect value={shiftId} onChange={setShiftId} options={(shifts||[]).map(s => ({ value: s._id, label: s.shiftName }))} placeholder="Select shift…" className={gradeId ? '' : 'opacity-60'} />
          </div>
          <div>
            <FilterSelect value={sectionId} onChange={setSectionId} options={(sections||[]).map(s => ({ value: s._id, label: `${s.grade?.gradeName || ''} • ${s.shift?.shiftName || ''} • Sec ${s.section}` }))} placeholder="Select section…" className={gradeId ? '' : 'opacity-60'} />
          </div>
          <div>
            <FilterSelect value={subjectId} onChange={setSubjectId} options={(subjects||[]).map(s => ({ value: s._id, label: s.subjectName }))} placeholder="Select subject…" className={gradeId ? '' : 'opacity-60'} />
          </div>
        </div>
        {canAssign ? (
          <div className="flex justify-end">
            <button type="button" onClick={onAdd} disabled={!canAdd || submitting} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-blue-600 bg-blue-600 text-white shadow-sm text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700">Add Assignment</button>
          </div>
        ) : null}

        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-2 py-1">Level</th>
                <th className="text-left px-2 py-1">Shift</th>
                <th className="text-left px-2 py-1">Section</th>
                <th className="text-left px-2 py-1">Subject</th>
                <th className="text-left px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {(assignments || []).length === 0 ? (
                <tr><td className="px-2 py-2 text-gray-500" colSpan={5}>No assignments.</td></tr>
              ) : (
                assignments.map(a => (
                  <tr key={a._id} className="border-t">
                    <td className="px-2 py-1">{a.gradeSection?.grade?.gradeName || '-'}</td>
                    <td className="px-2 py-1">{a.gradeSection?.shift?.shiftName || '-'}</td>
                    <td className="px-2 py-1">{a.gradeSection?.section || '-'}</td>
                    <td className="px-2 py-1">{a.subject?.subjectName || '-'}</td>
                    <td className="px-2 py-1 text-right">
                      {canAssign ? (
                        <ActionButton variant="danger" onClick={() => onRemove(a)}>Remove</ActionButton>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
