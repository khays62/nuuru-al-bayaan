import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EVENTS } from '../../utils/events';
import { useRealtimeInvalidation } from '../../shared/realtime/useRealtimeInvalidation';
import { dashboardKeys } from './services/queryKeys';

/**
 * EDCI: Realtime -> EVENTS.* -> invalidate dashboard queries -> UI updated.
 *
 * Dashboard is an aggregation surface; we invalidate by prefix to keep it simple and safe.
 */
export function useDashboardRealtimeInvalidation({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  const eventNames = useMemo(
    () => [
      EVENTS.STUDENTS_CHANGED,
      EVENTS.TEACHERS_CHANGED,
      EVENTS.TRANSFERS_CHANGED,
      EVENTS.PROMOTIONS_CHANGED,
      EVENTS.ATTENDANCE_CHANGED,
      EVENTS.EXAMS_CHANGED,
      EVENTS.RESULTS_CHANGED,
      EVENTS.TRANSCRIPT_CHANGED,
      EVENTS.ANNOUNCEMENTS_CHANGED,
      EVENTS.GRADE_SECTIONS_CHANGED,
      EVENTS.COHORTS_CHANGED,
      EVENTS.SUBJECTS_CHANGED,
      EVENTS.TIMETABLE_CHANGED,
      EVENTS.USERS_CHANGED,
    ],
    []
  );

  useRealtimeInvalidation(
    eventNames,
    (detail, evt) => {
      try {
        // Mark stale and immediately refetch active observers.
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
        queryClient.refetchQueries({ queryKey: dashboardKeys.all, type: 'active' });

        const eventName = String(evt?.type || '').trim();

        // ResultsChartsCard depends on these query prefixes.
        if (eventName === EVENTS.RESULTS_CHANGED || eventName === EVENTS.EXAMS_CHANGED) {
          queryClient.invalidateQueries({ queryKey: ['exams'] });
          queryClient.refetchQueries({ queryKey: ['exams'], type: 'active' });
        }

        // Grade section edits can affect Results subject options and related lookups.
        if (eventName === EVENTS.GRADE_SECTIONS_CHANGED) {
          queryClient.invalidateQueries({ queryKey: ['gradeSections'] });
          queryClient.refetchQueries({ queryKey: ['gradeSections'], type: 'active' });
        }
      } catch {
        // ignore
      }
    },
    { enabled }
  );
}
