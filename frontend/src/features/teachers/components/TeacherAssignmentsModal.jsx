import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '../../../shared/components/ui/Modal.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import { getGrades, getShifts } from '../../lookups/api/lookups';
import { listGradeSections } from '../../grades/api/gradeSections';
import { getSubjects } from '../../subjects/api/subjects';
import { addAssignment, getAssignments, removeAssignment } from '../api/teachersApi';
import { teacherKeys } from '../queryKeys';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import FilterDropdownSelect from '../../../shared/components/DataToolbar/FilterDropdownSelect.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import DataTable from '../../../shared/components/table/DataTable.jsx';

export default function TeacherAssignmentsModal({ isOpen, onClose, teacher }) {
  const [gradeId, setGradeId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [shiftId, setShiftId] = useState('');

  const teacherId = teacher?._id ? String(teacher._id) : '';
  const queryClient = useQueryClient();

  const onGradeChange = (next) => {
    const nextVal = String(next || '');
    setGradeId(nextVal);
    setShiftId('');
    setSectionId('');
    setSubjectId('');
  };

  const onShiftChange = (next) => {
    const nextVal = String(next || '');
    setShiftId(nextVal);
    setSectionId('');
    setSubjectId('');
  };

  const onSectionChange = (next) => {
    const nextVal = String(next || '');
    setSectionId(nextVal);
    setSubjectId('');
  };

  useEffect(() => {
    if (!isOpen) return;

    // Reset UI immediately so previous teacher data doesn't flash.
    setGradeId('');
    setShiftId('');
    setSectionId('');
    setSubjectId('');
  }, [isOpen, teacherId]);

  const gradesQuery = useQuery({
    queryKey: ['lookups', 'grades'],
    enabled: Boolean(isOpen),
    queryFn: async ({ signal }) => {
      const res = await getGrades({ signal });
      const rows = Array.isArray(res?.data) ? res.data : res;
      const sorted = Array.isArray(rows)
        ? [...rows].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        : [];
      return sorted;
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const shiftsQuery = useQuery({
    queryKey: ['lookups', 'shifts'],
    enabled: Boolean(isOpen),
    queryFn: async ({ signal }) => {
      const res = await getShifts({ signal });
      const rows = Array.isArray(res?.data) ? res.data : res;
      return Array.isArray(rows) ? rows : [];
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const assignmentsQuery = useQuery({
    queryKey: teacherKeys.assignments(teacherId),
    enabled: Boolean(isOpen && teacherId),
    queryFn: async ({ signal }) => {
      const res = await getAssignments(teacherId, {}, { signal });
      const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      return Array.isArray(rows) ? rows : [];
    },
    placeholderData: (prev) => prev,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const sectionsQuery = useQuery({
    queryKey: ['gradeSections', 'byGrade', String(gradeId || ''), String(shiftId || '')],
    // Avoid request thrash: UI requires shift before section selection.
    enabled: Boolean(isOpen && gradeId && shiftId),
    queryFn: async ({ signal }) => {
      const params = { grade: gradeId, limit: 100 };
      if (shiftId) params.shift = shiftId;
      const res = await listGradeSections(params, { signal });
      return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    },
    placeholderData: (prev) => prev,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects', 'byGrade', String(gradeId || '')],
    enabled: Boolean(isOpen && gradeId),
    queryFn: async ({ signal }) => {
      const res = await getSubjects({ grade: gradeId, limit: 100 }, { signal });
      return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    },
    placeholderData: (prev) => prev,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const addAssignmentMutation = useMutation({
    mutationFn: (payload) => addAssignment(teacherId, payload),
    onSuccess: () => {
      toast.success('Assignment added', { position: 'top-center' });
      try {
        queryClient.invalidateQueries({ queryKey: teacherKeys.assignments(teacherId), refetchType: 'active' });
      } catch { /* ignore */ }
    },
    onError: (e) => {
      toast.error(e?.data?.message || e?.message || 'Failed to add assignment', { position: 'top-center' });
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: ({ assignmentId }) => removeAssignment(teacherId, assignmentId),
    onSuccess: () => {
      try {
        queryClient.invalidateQueries({ queryKey: teacherKeys.assignments(teacherId), refetchType: 'active' });
      } catch { /* ignore */ }
    },
    onError: (e) => {
      toast.error(e?.data?.message || e?.message || 'Failed to remove assignment', { position: 'top-center' });
    },
  });

  const canAdd = useMemo(() => Boolean(sectionId && subjectId), [sectionId, subjectId]);

  const onAdd = async () => {
    if (!canAdd) return;
    await addAssignmentMutation.mutateAsync({ gsId: sectionId, subjectId, role: 'main' });
    setGradeId('');
    setShiftId('');
    setSectionId('');
    setSubjectId('');
  };

  const onRemove = async (assignment) => {
    if (!confirm('Remove this assignment?')) return;
    await removeAssignmentMutation.mutateAsync({ assignmentId: assignment._id });
  };

  const grades = gradesQuery.data || [];
  const shifts = shiftsQuery.data || [];
  const sections = sectionsQuery.data || [];
  const subjects = subjectsQuery.data || [];
  const assignments = assignmentsQuery.data || [];

  const error =
    assignmentsQuery.isError
      ? (assignmentsQuery.error?.data?.message || assignmentsQuery.error?.message || 'Failed to load assignments')
      : (sectionsQuery.isError || subjectsQuery.isError)
        ? 'Failed to load sections/subjects'
        : (gradesQuery.isError || shiftsQuery.isError)
          ? 'Failed to load data'
          : '';

  const loading = Boolean(
    (gradesQuery.isLoading && gradesQuery.data == null) ||
    (shiftsQuery.isLoading && shiftsQuery.data == null) ||
    (assignmentsQuery.isLoading && assignmentsQuery.data == null)
  );
  const submitting = Boolean(addAssignmentMutation.isPending || removeAssignmentMutation.isPending);

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
