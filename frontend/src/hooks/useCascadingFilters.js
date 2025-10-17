// useCascadingFilters.js
// Hook kooban oo maamula AY -> Grade -> Shift -> Section cascades.
// Contract (bilow): returns { academicYearId, setAcademicYearId, gradeId, setGradeId, shiftId, setShiftId, gradeSectionId, setGradeSectionId, sections, loadingSections, resetLower }
// Fiiro: Skeleton. Logic‑ga load sections waxa lagu xoojin doonaa marka la dabaqo page‑ka pilot.
import { useState, useEffect } from 'react';
import { listGradeSections } from '../api/apiService';

export function useCascadingFilters(initial = {}) {
  const [academicYearId, setAcademicYearId] = useState(initial.academicYearId || '');
  const [gradeId, setGradeId] = useState(initial.gradeId || '');
  const [shiftId, setShiftId] = useState(initial.shiftId || '');
  const [gradeSectionId, setGradeSectionId] = useState(initial.gradeSectionId || '');
  const [sections, setSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);

  const resetLower = (level) => {
    // level: 'ay' | 'grade' | 'shift'
    if (level === 'ay') { setGradeId(''); setShiftId(''); setGradeSectionId(''); setSections([]); }
    if (level === 'grade') { setShiftId(''); setGradeSectionId(''); setSections([]); }
    if (level === 'shift') { setGradeSectionId(''); setSections([]); }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!academicYearId || !gradeId || !shiftId) { setSections([]); return; }
      setLoadingSections(true);
      try {
        const res = await listGradeSections({ academicYear: academicYearId, grade: gradeId, shift: shiftId, limit: 200 });
        if (!ignore) setSections(res?.data || []);
      } catch {
        if (!ignore) setSections([]);
      } finally {
        if (!ignore) setLoadingSections(false);
      }
    })();
    return () => { ignore = true; };
  }, [academicYearId, gradeId, shiftId]);

  return { academicYearId, setAcademicYearId, gradeId, setGradeId, shiftId, setShiftId, gradeSectionId, setGradeSectionId, sections, loadingSections, resetLower };
}
