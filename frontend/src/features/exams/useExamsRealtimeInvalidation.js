import { useQueryClient } from '@tanstack/react-query';
import { EVENTS } from '../../utils/events';
import { useRealtimeInvalidation } from '../../shared/realtime/useRealtimeInvalidation';
import { examKeys } from './queryKeys';

/**
 * Exams realtime invalidation (EDCI).
 * Realtime -> exam/result events -> invalidate related queries -> UI updates.
 */
export function useExamsRealtimeInvalidation({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  useRealtimeInvalidation(
    [
      EVENTS.EXAMS_CHANGED,
      EVENTS.RESULTS_CHANGED,
      // When class subjects/structure changes, Subject dropdown + related data must refresh.
      EVENTS.GRADE_SECTIONS_CHANGED,
      EVENTS.SUBJECTS_CHANGED,
      // Enrollment-affecting events: these change which students belong to a grid/tab.
      EVENTS.STUDENTS_CHANGED,
      EVENTS.PROMOTIONS_CHANGED,
      EVENTS.TRANSFERS_CHANGED,
    ],
    () => {
      try {
        // Admin exam template settings
        queryClient.invalidateQueries({ queryKey: examKeys.templateVersions(), refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: examKeys.templateDetailBase, refetchType: 'active' });

        // Teacher score entry page (keys live under teacher namespace)
        queryClient.invalidateQueries({ queryKey: ['teacher', 'examGrid'], refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: ['teacher', 'examTypes'], refetchType: 'active' });

        // GradeSection detail is used to populate Subject dropdown.
        queryClient.invalidateQueries({ queryKey: ['teacher', 'gradeSection'], refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: ['teacher', 'gradeSections'], refetchType: 'active' });
      } catch {
        // ignore
      }
    },
    { enabled }
  );
}
