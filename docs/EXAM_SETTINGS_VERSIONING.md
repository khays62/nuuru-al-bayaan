# Exam Settings (Versioning) — Analysis + Implementation Notes

Ujeeddo: in “exam kii hore” (v1) uu had iyo jeer u soo baxo sidii uu ahaa, isla markaana v2 uu noqdo default mustaqbalka, iyadoo la oggol yahay in scores‑ka v1 iyo v2 labadaba la edit‑gareeyo.

## Mabda’a muhiimka ah
- Scores‑ka hore lama jabin karo: ExamScore wuxuu ku xiran yahay Exam, Exam‑kuna wuxuu xafidayaa `templateVersion`.
- Template cusub (v2) ma beddelayso data‑da v1: v1 iyo v2 waxay yeelanayaan ExamType docs kala gaar ah.
- Default mustaqbalka: “active template” ayaa go’aamisa version‑ka default ee la isticmaalo marka grid cusub la furo.

## Isbeddellada Backend (la hirgeliyay)
- ExamType waxaa lagu daray fields:
  - `templateVersion` (Number)
  - `maxScore` (Number) — max score per column/component
  - `templateTotal` (Number) — total-ka la sheegay ee version‑ka (activation validation)
  - `order` (Number) — column order
  - `isActive` (Boolean) — calaamadeyn version‑ka default
- Exam waxaa lagu daray `templateVersion`.
- Indexes:
  - ExamType: unique({ templateVersion, typeName })
  - Exam: unique({ examType, academicYear, gradeSection, templateVersion })
- Migration (startup):
  - Drops legacy unique index `typeName_1` on ExamType.
  - Sets missing `templateVersion` to 1 for ExamType/Exam.
  - Sets default v1 `maxScore/order` (Mid=40, Final=60; otherwise even split).

## API behavior (la hirgeliyay)
- `/api/exams/grid` supports `templateVersion` query.
  - haddii aan la soo dirin → server wuxuu qaataa active version.
  - columns waxaa lagu soo celiyaa `maxScore` + `order`.
- `/api/exams/score` validation: 0..`maxScore` (component‑kaas).
- `/api/exams/summary`, `/api/exams/transcript`, `/api/exams/has-scores` supports `templateVersion` query.
- Template endpoints (for Exam Settings UI):
  - `GET /api/exams/template/versions` → list versions + activeVersion
  - `GET /api/exams/template/detail?templateVersion=...` → version detail + components + totals
  - `PUT /api/exams/template/total` → set declared total per version
  - `POST /api/exams/template/component` → add component (typeName/maxScore/order)
  - `PUT /api/exams/template/component/:id` → edit component (with safety check if lowering maxScore)
  - `POST /api/exams/template/clone` → clone active (or specified) version into vNext
  - `PUT /api/exams/template/active` → set active version

**Activation rule:** lama activate‑gareyn karo version haddii `sum(maxScore) !== templateTotal`.

## Frontend behavior (la hirgeliyay)
- Exam Management page:
  - Added Version dropdown (v1, v2, …) defaulting to active.
  - Uses column `maxScore` for input max + total calculation (instead of guessing % weights).

## Sida loo isticmaalo (expected)
- Si aad u aragto/edit‑gareyso v1 scores: dooro Version = v1, kadib geli ama sax scores.
- Si v2 uu u noqdo default mustaqbalka: samee clone (v2), kadib activate v2.
- v1 data wuxuu sii ahaanayaa readable/editable (scores) mar walba.

## Next step: Exam Settings UI
- UI tab cusub “Exam Settings”:
  - show versions, clone, activate
  - edit components (typeName/order/maxScore) for *inactive* version ka hor activation
  - validate total = sum(maxScore) (tusaale 100)
