import React from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { EVENTS } from '../../../../utils/events';
import { useRealtimeInvalidation } from '../../../../shared/realtime/useRealtimeInvalidation';
import { studentKeys } from '../../queryKeys';

function asId(v) {
  const s = String(v || '').trim();
  return s ? s : null;
}

function matchesStudent(detail, studentId) {
  if (!studentId) return true;
  if (!detail) return true;

  const id = asId(detail?.studentId) || asId(detail?.id) || asId(detail?.student?._id);
  if (!id) return true;
  return id === studentId;
}

export function useStudentDashboardRealtimeInvalidation({
  studentId,
  isStudentSelf = false,
  enabled = true,
} = {}) {
  const queryClient = useQueryClient();
  const sid = asId(studentId);

  const invalidate = React.useCallback((opts) => {
    try {
      queryClient.invalidateQueries(opts);
    } catch {
      // ignore
    }
  }, [queryClient]);

  const invalidateStudentProfile = React.useCallback(() => {
    if (!sid) return;
    invalidate({ queryKey: studentKeys.profile(sid), refetchType: 'active' });
  }, [invalidate, sid]);

  const invalidateStudentTransfers = React.useCallback(() => {
    if (!sid) return;
    invalidate({ queryKey: studentKeys.transfersBase(sid), refetchType: 'active' });
  }, [invalidate, sid]);

  const invalidateStudentHistory = React.useCallback(() => {
    if (!sid) return;
    invalidate({ queryKey: studentKeys.historyBase(sid), refetchType: 'active' });
  }, [invalidate, sid]);

  const invalidateStudentTranscript = React.useCallback(() => {
    if (!sid) return;
    invalidate({ queryKey: studentKeys.transcriptBase(sid), refetchType: 'active' });
    invalidate({ queryKey: studentKeys.transcriptIndexBase(sid), refetchType: 'active' });
    invalidate({ queryKey: studentKeys.overallSummary(sid), refetchType: 'active' });
    invalidate({ queryKey: studentKeys.levelStatsBase(sid), refetchType: 'active' });
  }, [invalidate, sid]);

  const invalidateStudentAttendance = React.useCallback(() => {
    // Self attendance is keyed without studentId.
    if (isStudentSelf) {
      invalidate({ queryKey: studentKeys.attendanceSelfBase(), refetchType: 'active' });
    }
    if (sid) {
      invalidate({ queryKey: studentKeys.attendanceByStudentBase(sid), refetchType: 'active' });
    }
  }, [invalidate, isStudentSelf, sid]);

  const invalidateStudentTimetable = React.useCallback(() => {
    invalidate({ queryKey: studentKeys.timetableSlotsBase(), refetchType: 'active' });
    invalidate({ queryKey: studentKeys.timetableSlotsSelfBase(), refetchType: 'active' });
  }, [invalidate]);

  useRealtimeInvalidation(
    [
      EVENTS.STUDENTS_CHANGED,
      EVENTS.TRANSFERS_CHANGED,
      EVENTS.STUDENT_FINANCE_CHANGED,
      EVENTS.TRANSCRIPT_CHANGED,
      EVENTS.EXAMS_CHANGED,
      EVENTS.RESULTS_CHANGED,
      EVENTS.ATTENDANCE_CHANGED,
      EVENTS.TIMETABLE_CHANGED,
    ],
    (e) => {
      const name = String(e?.type || '');
      const detail = e?.detail;

      if (!matchesStudent(detail, sid)) return;

      if (name === EVENTS.STUDENTS_CHANGED) {
        invalidateStudentProfile();
        return;
      }

      if (name === EVENTS.TRANSFERS_CHANGED) {
        invalidateStudentTransfers();
        invalidateStudentHistory();
        invalidateStudentTimetable();
        invalidateStudentTranscript();
        invalidateStudentProfile();
        return;
      }

      if (name === EVENTS.STUDENT_FINANCE_CHANGED) {
        if (!sid) return;
        invalidate({ queryKey: studentKeys.financeMonthHistoryBase(sid), refetchType: 'active' });
        return;
      }

      if (name === EVENTS.TRANSCRIPT_CHANGED || name === EVENTS.EXAMS_CHANGED || name === EVENTS.RESULTS_CHANGED) {
        invalidateStudentTranscript();
        return;
      }

      if (name === EVENTS.ATTENDANCE_CHANGED) {
        invalidateStudentAttendance();
        return;
      }

      if (name === EVENTS.TIMETABLE_CHANGED) {
        invalidateStudentTimetable();
      }
    },
    { enabled: Boolean(enabled) }
  );
}
