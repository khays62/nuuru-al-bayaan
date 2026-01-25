# Frontend Lookups & Cascading Filters

Qoraankan waxa uu sharxayaa components‑ka dib‑loogu‑adeego ee filtarrada (lookups) iyo hook‑ga cascades, si ay boggaga (Students, Grades, Subjects, Exams, Results, Transcript) uga wada helaan waayo‑aragnimo isku mid ah.

## Components

- `AcademicYearSelect` — soo bandhiga Academic Years
- `GradeSelect` — soo bandhiga Grades
- `ShiftSelect` — soo bandhiga Shifts
- `GradeSectionSelect` — soo bandhiga Sections iyadoo ku xirnaanaysa Grade + Shift (AY looma baahna si sections loo soo qaado)

Props muhiim ah (dhamaan waxay taageeraan):
- `value` (string) iyo `onChange(newValue: string)` — xakamaynta xulashada
- `placeholder` (string) — qoraalka marka aan la xulin (e.g. "Any", "Grade")
- `id`, `name`, `aria-label` — a11y/qaabeynta forms (muhiim marka labels muuqda laga tago)
- `className` — habaynta ballac/dherer (e.g. `w-full min-w-40`)
- `disabled` — marka la xiro ama loading uu socdo

Tusaale (toolbar filters):

```
<AcademicYearSelect
  id="results-ay"
  name="results-ay"
  aria-label="Academic Year"
  value={academicYearId}
  onChange={setAcademicYearId}
  className="w-full"
  placeholder="Academic Year"
/>
<GradeSelect id="results-grade" aria-label="Grade" value={gradeId} onChange={setGradeId} className="w-full" placeholder="Grade" />
<ShiftSelect id="results-shift" aria-label="Shift" value={shiftId} onChange={setShiftId} className="w-full" placeholder="Shift" />
<GradeSectionSelect
  id="results-section"
  aria-label="Section"
  academicYearId={academicYearId}
  gradeId={gradeId}
  shiftId={shiftId}
  value={gradeSectionId}
  onChange={setGradeSectionId}
  className="w-full"
  placeholder="Section"
/>
```

Fiiro: `GradeSectionSelect` wuxuu si toos ah u xiraa Grade + Shift; haddii mid ka maqan yahay, wuu noqdaa disabled ilaa labadaas la xulo.
  - `academicYearId` waxa uu yahay context (bogagga Results/Exams/Transcript), balse sections fetch-ka lama xiriiriyo AY.

UX: toolbars‑ka waa placeholder‑only (labels muuqda ma jiraan) si ay ula egyihiin `StudentPage`. Si a11y loo hubiyo, had iyo jeer ku dar `aria-label` ama `aria-labelledby`.

## Hook: useCascadingFilters

Haddii aad rabto inaad si buuxda u maamusho cascades‑ka (oo aad u baahato liiska sections ama reset chain), waxaad isticmaali kartaa hook‑gan:

API:
```
const {
  academicYearId, setAcademicYearId,
  gradeId, setGradeId,
  shiftId, setShiftId,
  gradeSectionId, setGradeSectionId,
  sections, loadingSections,
  resetLower,
} = useCascadingFilters(initial);
```

- `resetLower('ay'|'grade'|'shift')` — marka heerka sare is beddelo, waxa uu nadiifiyaa kuwa hoose (e.g. dooro AY cusub → nadiifi Grade/Shift/Section)
- `sections` iyo `loadingSections` — haddii aad u baahan tahay inaad muujiso "Sections" adiga oo aan adeegsan `GradeSectionSelect`

Tusaale kooban:
```
const { academicYearId, setAcademicYearId, gradeId, setGradeId, shiftId, setShiftId, gradeSectionId, setGradeSectionId, resetLower } = useCascadingFilters();

<AcademicYearSelect value={academicYearId} onChange={(v)=>{ setAcademicYearId(v); resetLower('ay'); }} />
<GradeSelect value={gradeId} onChange={(v)=>{ setGradeId(v); resetLower('grade'); }} />
<ShiftSelect value={shiftId} onChange={(v)=>{ setShiftId(v); resetLower('shift'); }} />
<GradeSectionSelect academicYearId={academicYearId} gradeId={gradeId} shiftId={shiftId} value={gradeSectionId} onChange={setGradeSectionId} />
```
