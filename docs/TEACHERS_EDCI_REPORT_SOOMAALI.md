# Teacher Feature — EDCI (SSE + TanStack Query) Warbixin (Af‑Soomaali)

Ujeeddo: Teacher feature-ka oo dhan in lagu dabaqo qaabka **Event‑Driven Cache Invalidation (EDCI)**:

**Realtime → Events → Invalidate Queries → UI updated**

Waxaa la ilaalshay UI/behavior-kii hore (table, modals, sorting/pagination, toasts), kaliya “data layer”-ka ayaa la standard gareeyay.

---

## 1) Frontend: waxa la beddelay

### A) Query keys (Teachers)
- Waxaa la ballaariyay keys-ka Teachers si ay u taageeraan admin/staff teacher management:
  - `adminListBase`, `adminList({search,status})`
  - `adminProfileBase`, `adminProfile(teacherId)`
  - `adminAuditLogsBase`, `adminAuditLogs({teacherId,page,limit})`
  - Waxaa sidoo kale lagu daray prefix keys granular invalidation:
    - `assignmentsBase`, `studentsCountBase`, `studentsListBase`

File: [frontend/src/features/teachers/queryKeys.js](frontend/src/features/teachers/queryKeys.js)

### B) Realtime invalidation hook (EDCI)
- Waxaa la sameeyay hook cusub:
  - `useTeachersRealtimeInvalidation({ teacherId })`
- Waxay dhageysataa `EVENTS.TEACHERS_CHANGED` (oo ka yimaada SSE dispatcher ama local emits)
- Waxay invalidate gareysaa:
  - teacher admin list
  - (optional) teacher profile + audit logs + assignments marka event-ku yahay teacherId-ka la daawanayo

File: [frontend/src/features/teachers/useTeachersRealtimeInvalidation.js](frontend/src/features/teachers/useTeachersRealtimeInvalidation.js)

### C) Teachers Management Page (Admin/Staff)
- `TeachersPage` waxaa laga wareejiyay “manual fetch + local state list” → `useQuery`.
- Actions (create/update/deactivate/reactivate/reset password) waxaa loo wareejiyay `useMutation`.
- Local actions waxay sidoo kale diraan `emitTeachersChanged({source:'local', ...})` si cross-tabs / pages u degdegto.

File: [frontend/src/features/teachers/pages/TeachersPage.jsx](frontend/src/features/teachers/pages/TeachersPage.jsx)

### D) Teacher Assignments Modal (Admin/Staff)
- `TeacherAssignmentsModal` waxaa laga wareejiyay “manual useEffect fetch chains” → `useQuery` + `useMutation`.
- Assignments query wuxuu isticmaalaa `teacherKeys.assignments(teacherId)`.
- Add/Remove assignment: mutation success → invalidate assignments query + emit `TEACHERS_CHANGED`.

File: [frontend/src/features/teachers/components/TeacherAssignmentsModal.jsx](frontend/src/features/teachers/components/TeacherAssignmentsModal.jsx)

### E) Teacher Profile Page (Admin view + Teacher self)
- Admin view (`/teachers/:teacherId`) profile + audit logs waxaa loo wareejiyay `useQuery`.
- Waxaa la saxay bug: `fetchJson` waxa uu ahaa la isticmaalo laakiin import ma jirin; hadda waa la import-gareeyay.
- Teacher self change-password: waxaa loo wareejiyay `useMutation`.

File: [frontend/src/features/teachers/components/dashboard/TeacherProfileCard.jsx](frontend/src/features/teachers/components/dashboard/TeacherProfileCard.jsx)

### F) Teacher dashboard: granular invalidation
- `TeacherClassesPage` realtime invalidation hore wuxuu u invalidatin jiray `teacherKeys.base` (broad).
- Hadda wuxuu invalidatinayaa kaliya keys-ka u baahan refresh:
  - `assignmentsBase`, `studentsCountBase`, `studentsListBase`

File: [frontend/src/features/teachers/components/dashboard/TeacherClassesPage.jsx](frontend/src/features/teachers/components/dashboard/TeacherClassesPage.jsx)

---

## 2) Backend: waxa la beddelay

Ujeeddo: haddii backend uusan publish-gareynin event-ka saxda ah, realtime/EDCI wuxuu noqdaa “qolof”.

### Publish realtime events (Teacher CRUD)
- Waxaa lagu daray `publishRealtime({ type: 'teachers:changed', id, ts })` (iyo `users:changed`) meelaha hore u maqnaa:
  - Create teacher
  - Create teacher login user
  - Update teacher
  - Delete teacher

File: [backend/controllers/teacherController.js](backend/controllers/teacherController.js)

Xasuusin: `deactivate/reactivate/reset-password/addAssignment/removeAssignment` horeyba publish bay u lahaayeen; hadda CRUD-ga intiisa kale ayaa la dhameystiray.

---

## 3) Sidee loo tijaabiyaa (Smoke verification)

### Admin/Staff realtime
1. Fur 2 browser (Chrome + Edge) oo admin/staff ku login.
2. Tag `/teachers` labadaba.
3. Mid ka samee:
   - Add teacher
   - Edit teacher
   - Deactivate/Reactivate
   - Reset password
   - Add/Remove assignments
4. Browser-ka kale waa inuu si automatic ah u refresh-gareeyaa (Realtime → invalidate → refetch).

### Admin profile realtime
1. Browser A: fur `/teachers/:id`.
2. Browser B: ka beddel teacher-ka (edit/status/assignments).
3. Browser A: profile/logs waa inay refetch sameeyaan marka `teachers:changed` yimaado.

### Teacher dashboard realtime (My Classes)
- Markaad assignments ama roster-related data beddesho (transfer/promotion/students changes), “My Classes” counts/roster waa inay si sax ah u update-gareeyaan iyadoo la invalidatinayo keys granular.

---

## 4) Status
- Frontend build: PASS
- Backend jest smoke: PASS

---

Haddii aad rabto, rollout-ka xiga waxaan ka dhigi karaa **Attendance Reports** ama **Timetable** (Pilot 3) anigoo raacaya isla template‑kan (EDCI).