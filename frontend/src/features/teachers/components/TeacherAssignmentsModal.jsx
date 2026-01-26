import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import Modal from '../../../shared/components/ui/Modal.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import { getGrades, getShifts } from '../../lookups/api/lookups';
import { listGradeSections } from '../../grades/api/gradeSections';
import { getSubjects } from '../../subjects/api/subjects';
import { addAssignment, getAssignments, removeAssignment } from '../api/teachersApi';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import FilterDropdownSelect from '../../../shared/components/DataToolbar/FilterDropdownSelect.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import DataTable from '../../../shared/components/table/DataTable.jsx';

export default function TeacherAssignmentsModal({ isOpen, onClose, teacher }) {
  const [grades, setGrades] = useState([]);
  const [gradeId, setGradeId] = useState('');
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [shiftId, setShiftId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onGradeChange = (next) => {
    const nextVal = String(next || '');
    setGradeId(nextVal);
    setShiftId('');
    setSectionId('');
    setSubjectId('');
    setSections([]);
    setSubjects([]);
  };

  const onShiftChange = (next) => {
    const nextVal = String(next || '');
    setShiftId(nextVal);
    setSectionId('');
    setSubjectId('');
    setSections([]);
  };

  const onSectionChange = (next) => {
    const nextVal = String(next || '');
    setSectionId(nextVal);
    setSubjectId('');
  };

  useEffect(() => {
    if (!isOpen) return;
    const teacherId = teacher?._id;

    // Reset UI immediately so previous teacher data doesn't flash.
    setError('');
    setLoading(true);
    setAssignments([]);
    setGradeId('');
    setShiftId('');
    setSectionId('');
    setSubjectId('');
    setSections([]);
    setSubjects([]);

    let ignore = false;
    Promise.all([
      getGrades(),
      getShifts(),
      teacherId ? getAssignments(teacherId) : Promise.resolve([]),
    ])
      .then(([gradesData, shiftsData, aData]) => {
        if (ignore) return;

        const g = Array.isArray(gradesData?.data) ? gradesData.data : gradesData;
        const sortedG = Array.isArray(g)
          ? [...g].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          : [];
        setGrades(sortedG);

        const sh = Array.isArray(shiftsData?.data) ? shiftsData.data : shiftsData;
        setShifts(sh || []);

        const a = Array.isArray(aData?.data) ? aData.data : Array.isArray(aData) ? aData : [];
        setAssignments(a);
      })
      .catch(() => {
        if (ignore) return;
        setError('Failed to load data');
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isOpen, teacher?._id]);

  useEffect(() => {
    if (!gradeId) {
      setSections([]);
      setSectionId('');
      setSubjects([]);
      setSubjectId('');
      return;
    }
    (async () => {
      try {
        const params = { grade: gradeId, limit: 100 };
        if (shiftId) params.shift = shiftId;
        const [secRes, subjRes] = await Promise.all([
          listGradeSections(params),
          getSubjects({ grade: gradeId, limit: 100 }),
        ]);
        setSections(secRes?.data || []);
        setSubjects(subjRes?.data || []);
      } catch {
        setError('Failed to load sections/subjects');
      }
    })();
  }, [gradeId, shiftId]);

  const canAdd = useMemo(() => Boolean(sectionId && subjectId), [sectionId, subjectId]);

  const onAdd = async () => {
    if (!canAdd || submitting) return;
    setSubmitting(true);
    try {
      await addAssignment(teacher._id, { gsId: sectionId, subjectId, role: 'main' });
      toast.success('Assignment added', { position: 'top-center' });
      const aData = await getAssignments(teacher._id);
      const a = Array.isArray(aData?.data) ? aData.data : (Array.isArray(aData) ? aData : []);
      setAssignments(a);
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
    if (!confirm('Remove this assignment?')) return;
    try {
      await removeAssignment(teacher._id, assignment._id);
      setAssignments((prev) => prev.filter((x) => x._id !== assignment._id));
    } catch (e) {
      toast.error(e?.message || 'Failed to remove assignment', { position: 'top-center' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assignments • ${teacher?.fullName || teacher?.teacherId || ''}`}>
      <div className="space-y-4">
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {loading && <div className="text-sm text-gray-600">Loading assignments...</div>}
        <FilterRow>
          <FilterItem>
            <DropdownSelect
              value={gradeId}
              onChange={onGradeChange}
              options={(grades || []).map((g) => ({ value: g._id, label: g.gradeName }))}
              placeholder="Select level…"
              maxHeightClassName="max-h-72"
            />
          </FilterItem>

          <FilterItem>
            <FilterDropdownSelect
              value={shiftId}
              onChange={onShiftChange}
              options={(shifts || []).map((s) => ({ value: s._id, label: s.shiftName }))}
              placeholder="Select shift…"
              disabled={!gradeId}
              className={gradeId ? '' : 'opacity-60'}
            />
          </FilterItem>

          <FilterItem>
            <FilterDropdownSelect
              value={sectionId}
              onChange={onSectionChange}
              options={(sections || []).map((s) => ({
                value: s._id,
                label: `${s.grade?.gradeName || ''} • ${s.shift?.shiftName || ''} • Sec ${s.section}`,
              }))}
              placeholder="Select section…"
              disabled={!gradeId || !shiftId}
              className={gradeId && shiftId ? '' : 'opacity-60'}
            />
          </FilterItem>

          <FilterItem>
            <FilterDropdownSelect
              value={subjectId}
              onChange={setSubjectId}
              options={(subjects || []).map((s) => ({ value: s._id, label: s.subjectName }))}
              placeholder="Select subject…"
              disabled={!gradeId || !sectionId}
              className={gradeId && sectionId ? '' : 'opacity-60'}
            />
          </FilterItem>
        </FilterRow>
        <div className="flex justify-end">
          <ActionButton type="button" variant="brand" onClick={onAdd} disabled={!canAdd || submitting}>Add Assignment</ActionButton>
        </div>

        <div className="border rounded-md overflow-hidden">
          {(assignments || []).length === 0 ? (
            <div className="px-2 py-2 text-gray-500 text-sm">No assignments.</div>
          ) : (
            <DataTable
              rows={assignments}
              showControls={false}
              theadClassName=""
              headerRowClassName="bg-gray-50 border-b"
              baseRowClassName="border-t"
              useDefaultHeaderStyles={false}
              columns={[
                { key: 'level', label: 'Level', thClassName: 'text-left px-2 py-1 text-xs font-medium text-gray-700', tdClassName: 'px-2 py-1 text-gray-800 text-sm' },
                { key: 'shift', label: 'Shift', thClassName: 'text-left px-2 py-1 text-xs font-medium text-gray-700', tdClassName: 'px-2 py-1 text-gray-800 text-sm' },
                { key: 'section', label: 'Section', thClassName: 'text-left px-2 py-1 text-xs font-medium text-gray-700', tdClassName: 'px-2 py-1 text-gray-800 text-sm' },
                { key: 'subject', label: 'Subject', thClassName: 'text-left px-2 py-1 text-xs font-medium text-gray-700', tdClassName: 'px-2 py-1 text-gray-800 text-sm' },
                { key: 'actions', label: '', align: 'right', noPrint: true, thClassName: 'text-right px-2 py-1', tdClassName: 'px-2 py-1 text-right' },
              ]}
              getRowKey={(a) => a._id}
              renderCell={(a, col) => {
                switch (col.key) {
                  case 'level':
                    return a.gradeSection?.grade?.gradeName || '-';
                  case 'shift':
                    return a.gradeSection?.shift?.shiftName || '-';
                  case 'section':
                    return a.gradeSection?.section || '-';
                  case 'subject':
                    return a.subject?.subjectName || '-';
                  case 'actions':
                    return <ActionButton variant="danger" onClick={() => onRemove(a)}>Remove</ActionButton>;
                  default:
                    return '';
                }
              }}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
