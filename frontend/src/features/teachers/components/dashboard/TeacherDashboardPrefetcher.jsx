import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../../../auth/AuthContext';
import { teacherKeys } from '../../queryKeys';

import { getAcademicYears, getGradeSectionById, listStudents } from '../../../../api';
import { getAssignments as getTeacherAssignments } from '../../api/teachersApi';
import { getSlotsWithOptions } from '../../../timetable/api/timetable';
import { getAttendanceReportSummaryWithOptions } from '../../../attendance/api/attendanceReports';
import { getExamSummaryAbort, getExamTypes } from '../../../exams/api/exams';
import { getSessionSignal } from '../../../../api/sessionAbort';
import { listGradeSections } from '../../../grades/api/gradeSections';
import { getGrades, getShifts } from '../../../lookups/api/lookups';

function isoDateOnly(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function subDays(date, days) {
  const dt = new Date(date);
  dt.setUTCDate(dt.getUTCDate() - Number(days || 0));
  return dt;
}

export default function TeacherDashboardPrefetcher() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const isTeacher = String(auth?.user?.role || '').toLowerCase() === 'teacher';
  const teacherRef = String(auth?.user?.teacherRef || '');

  const { from, to } = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 29);
    return { from: isoDateOnly(start), to: isoDateOnly(end) };
  }, []);

  useEffect(() => {
    if (!isTeacher) return;
    if (!teacherRef) return;

    const sessionSignal = getSessionSignal();

    // 1) Prefetch teacher assignments
    queryClient.ensureQueryData({
      queryKey: teacherKeys.assignments(teacherRef),
      queryFn: async () => {
        const res = await getTeacherAssignments(teacherRef, {}, { signal: sessionSignal });
        return Array.isArray(res?.data) ? res.data : [];
      },
    }).catch(() => {});

    // 2) Prefetch academic years (used by results)
    queryClient.ensureQueryData({
      queryKey: ['academicYears'],
      queryFn: async () => {
        const list = await getAcademicYears();
        return Array.isArray(list) ? list : (list?.data || []);
      },
    }).catch(() => {});

    // 2b) Prefetch basic lookups used by teacher pages
    queryClient.ensureQueryData({
      queryKey: ['grades'],
      queryFn: async () => {
        const res = await getGrades();
        return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      },
    }).catch(() => {});

    queryClient.ensureQueryData({
      queryKey: ['shifts'],
      queryFn: async () => {
        const res = await getShifts();
        return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      },
    }).catch(() => {});

    // 2c) Prefetch grade sections (teacher-scoped server-side)
    queryClient.ensureQueryData({
      queryKey: teacherKeys.gradeSections({ limit: 200 }),
      queryFn: async () => {
        const res = await listGradeSections({ limit: 200 });
        return Array.isArray(res?.data) ? res.data : [];
      },
    }).catch(() => {});

    // 2d) Prefetch today's teacher timetable (Timetable page opens instantly)
    const getTimetableDayIndexFromLocalDate = (d = new Date()) => {
      const js = d.getDay();
      if (js === 6) return 0;
      if (js === 0) return 1;
      return js + 1;
    };
    const todayIdx = getTimetableDayIndexFromLocalDate(new Date());
    queryClient.ensureQueryData({
      queryKey: teacherKeys.timetableTodayMine({ dayIndex: todayIdx }),
      queryFn: async () => {
        const res = await getSlotsWithOptions({ mine: 1, day: todayIdx }, { signal: sessionSignal });
        return Array.isArray(res?.data) ? res.data : [];
      },
    }).catch(() => {});
  }, [queryClient, isTeacher, teacherRef]);

  // 3) Once assignments are known, prefetch heavy dashboard data for *first* assignment
  // so TeacherDashboard feels instant and later navigation reuses warm cache.
  useEffect(() => {
    if (!isTeacher) return;
    if (!teacherRef) return;

    let canceled = false;
    const sessionSignal = getSessionSignal();

    (async () => {
      try {
        const assignments = await queryClient.ensureQueryData({
          queryKey: teacherKeys.assignments(teacherRef),
          queryFn: async () => {
            const res = await getTeacherAssignments(teacherRef, {}, { signal: sessionSignal });
            return Array.isArray(res?.data) ? res.data : [];
          },
        });
        if (canceled) return;

        const list = Array.isArray(assignments) ? assignments : [];
        const gradeSectionIds = Array.from(
          new Set(
            list
              .map((a) => a?.gradeSection?._id || a?.gradeSection)
              .filter(Boolean)
              .map((id) => String(id))
          )
        );
        if (gradeSectionIds.length === 0) return;

        // Prefer the first assignment as default, but still warm cache for all sections.
        const first = list[0] || null;
        const firstGsId = first?.gradeSection?._id || first?.gradeSection || null;
        const firstSubjectId = first?.subject?._id || first?.subject || null;
        const gradeSectionId = firstGsId ? String(firstGsId) : gradeSectionIds[0];
        const subjId = firstSubjectId ? String(firstSubjectId) : '';

        // Determine default academicYearId from cached academicYears list (latest)
        const years = await queryClient.ensureQueryData({
          queryKey: ['academicYears'],
          queryFn: async () => {
            const list2 = await getAcademicYears();
            return Array.isArray(list2) ? list2 : (list2?.data || []);
          },
        });
        if (canceled) return;
        const academicYearId = years?.[0]?._id ? String(years[0]._id) : '';

        // Attendance: prefetch slots for (GS, Subject) then summary (GS, date range)
        if (subjId) {
          queryClient.ensureQueryData({
            queryKey: teacherKeys.subjectSlots({ gradeSectionId, subjectId: subjId }),
            queryFn: async () => {
              const res = await getSlotsWithOptions(
                { gs: gradeSectionId, subject: subjId, mine: 1 },
                { signal: sessionSignal }
              );
              return Array.isArray(res?.data) ? res.data : [];
            },
          }).catch(() => {});
        }

        // Warm cache for ALL assigned sections: timetable + section details + student counts.
        for (const gs of gradeSectionIds) {
          queryClient.ensureQueryData({
            queryKey: teacherKeys.timetableSlots({ gradeSectionId: gs }),
            queryFn: async () => {
              const res = await getSlotsWithOptions({ gs }, { signal: sessionSignal });
              return Array.isArray(res?.data) ? res.data : [];
            },
          }).catch(() => {});

          queryClient.ensureQueryData({
            queryKey: teacherKeys.gradeSectionById(gs),
            queryFn: async () => {
              const { ok, data, error } = await getGradeSectionById(gs);
              if (!ok) throw new Error(error || 'Failed to load grade section');
              return data;
            },
          }).catch(() => {});

          queryClient.ensureQueryData({
            queryKey: teacherKeys.studentsCount({ gradeSectionId: gs, enrollmentStatus: 'active' }),
            queryFn: async () => {
              const r = await listStudents({ gradeSectionId: gs, enrollmentStatus: 'active', limit: 1 }, { signal: sessionSignal });
              const total = Number(r?.meta?.total ?? 0);
              return Number.isFinite(total) ? total : 0;
            },
          }).catch(() => {});
        }

        queryClient.ensureQueryData({
          queryKey: teacherKeys.attendanceReportSummary({ gradeSectionId, from, to }),
          queryFn: async () => {
            const res = await getAttendanceReportSummaryWithOptions(
              { gradeSectionId, from, to, mode: 'both', rosterScope: 'current' },
              { signal: sessionSignal }
            );
            return res;
          },
        }).catch(() => {});

        // Results: prefetch summary for subject mode (if subject exists) otherwise overall.
        if (academicYearId) {
          const summaryMode = subjId ? 'subject' : 'overall';
          const summaryParams = {
            academicYearId,
            gradeSectionId,
            enrollmentStatus: 'active',
            mode: summaryMode,
          };
          if (summaryMode === 'subject') summaryParams.subjectId = subjId;

          queryClient.ensureQueryData({
            queryKey: teacherKeys.examSummary(summaryParams),
            queryFn: async () => {
              const { ok, data, error } = await getExamSummaryAbort(summaryParams, { signal: sessionSignal });
              if (!ok) throw new Error(error || 'Failed to load exam summary');
              return data;
            },
          }).catch(() => {});

          // Also prefetch exam types list (needed for performance view)
          queryClient.ensureQueryData({
            queryKey: teacherKeys.examTypes({ academicYearId, gradeSectionId, templateVersion: '' }),
            queryFn: async () => {
              const list3 = await getExamTypes({ academicYearId, gradeSectionId });
              return Array.isArray(list3) ? list3 : (list3?.data || []);
            },
          }).catch(() => {});
        }
      } catch {
        // non-blocking
      }
    })();

    return () => {
      canceled = true;
    };
  }, [queryClient, isTeacher, teacherRef, from, to]);

  return null;
}
