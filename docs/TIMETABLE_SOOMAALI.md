Timetable (Jadwalka Casharrada)

Ujeeddo
- Timetable wuxuu kaydiyaa jadwalka casharrada ee fasal kasta (GS) iyadoo la qeexayo maalin, waqti (bilow → dhammaad), maaddo iyo macallin. Ujeedku waa in admin uu si dabacsan u sameyn karo jadwal la jaanqaadi kara baahida iskuulka.

Erayga “Slot”/TimetableSlot
- Slot: hal cell oo jadwal ah oo ka kooban GS (Grade+Shift+Section), maalin (Sabti → Jimce), waqti (startTime → endTime) ama period code, maaddo iyo macallinka casharka qabanaya. Ikhtiyaari: room iyo notes.

Tiirarka Jadwalka
- GS: Fasal lagu doorto “Level → Shift → Section”.
- Subject: Maaddo laga doorto filter; macallin si aamusnaan ah auto‑fill ka imanaya TeacherAssignment (GS+Subject). Haddii aan la helin, server‑ku wuu diidi karaa (policy: “No teacher assigned…”).
- Time: Waxaan doornay “times” (ma aha periods). Waxaa la adeegsanayaa startTime iyo endTime (HH:mm).
- Days: 7 maalmood (Sabti → Jimce). Waxaa la ogol yahay in hal mar lagu doorto dhowr maalmood.
- Room: Text ikhtiyaari.

Model: TimetableSlot (theory)
- Fields: gradeSection, subject, teacher, dayOfWeek (0–6), startTime (HH:mm), endTime (HH:mm), room?, notes?, createdAt/updatedAt.
- Indexes:
  - Unique GS‑cell: gradeSection + dayOfWeek + startTime + endTime (si aan cell u laba‑noqon).
  - Query: teacher + dayOfWeek; gradeSection + dayOfWeek (waxay dardargelisaa helidda isku‑dhacyo iyo liisaska).

Xeerarka & Validation
- GS conflict: Hal GS ma qaadan karo laba slot oo isku waqti/maalin. Overlap = (newStart < existEnd) AND (newEnd > existStart).
- Teacher conflict: Hal macallin ma qaban karo laba GS isku mar. Isla overlap test.
- Room conflict (ikhtiyaari): Hal qol ma qaadan karo laba slot isku waqti/maalin. Isla overlap test.
- Time sax: startTime < endTime; format sax ah (HH:mm).
- Assignment: Haddii teacher lama keenin, isku day auto‑fill ka TeacherAssignment (GS+Subject). Haddii la waayo, ogol “unassigned” ama ku qas doorasho macallin (policy).

API (proposal)
- GET /api/timetable/slots
  - Query: gs?, teacher?, day?, from?=HH:mm, to?=HH:mm, subject?
  - Soo celi liis slots.
- POST /api/timetable/slots
  - Payload: { gsId, subjectId, dayOfWeek, startTime, endTime, room? }
  - Server: auto‑fill teacher haddii assignment jiro; hubi GS/Teacher/Room conflicts; 201 ama 409 farriin cad.
- POST /api/timetable/slots/bulk
  - Payload: { gsId, subjectId, days:[0..6], startTime, endTime, room? }
  - Server: abuuri slots badan; soo celi natiijo faahfaahsan: created[], conflicts[{day, reason}], duplicates[]; 207/200 ama 409 guud haddii dhammaan kufashilmaan.
- PATCH /api/timetable/slots/:id
  - Edit/move slot (day/time/room/subject); teacher waxaa badanaa laga helaa assignment (UI‑ga ma dooranayo).
- DELETE /api/timetable/slots/:id
  - Ka saar slot.
- Farriimaha qalad (examples):
  - 409: “Period already occupied for this class.”
  - 409: “Teacher has another class in this period.”
  - 409: “Room already booked at this time.”
  - 400: “Invalid time range (start ≥ end).”

Frontend: Tab Timetable (Admin)
- Filters kor: Level, Shift, Section (waajib); Subject (auto‑fill Teacher), Days (multi‑select), StartTime, EndTime, Room (ikhtiyaari).
- Abuuris:
  - “Add Slot” (hal maalin) ama “Add Slots (Multi‑day)” oo adeegsada days[] si hal mar loogu abuuro dhowr slots.
  - Haddii server uu soo celiyo conflicts, toasts cad + liis maalmood ee fashilmay.
- Grid muuqaal:
  - Rows = maalmaha todobaadka (Sabti → Jimce).
  - Columns = times (dynamic): laga dhisi karo uruurinta slots jira ama “time buckets” uu admin qeexo. Cell = SubjectName + caption “TeacherName”, hover → Room iyo HH:mm–HH:mm.
- Edit/Delete:
- Edit/Delete:
  - Edit = Drag‑and‑Drop (jiid slot → ku tuur cell kale) si loo beddelo day/time; validation mar kale; toasts.
  - Delete → confirm.

Roles & View
- Admin: CRUD dhammaan GS.
- Teacher: View timetable‑kiisa iyo GS uu ku xiran yahay; edit waa ikhtiyaari, inta badan lama ogola.

Flexible vs Practical
- Bulk days API waa ka fiican 7 requests; waxay soo celineysaa natiijooyin faahfaahsan (per‑day).
- Columns “time buckets” waxay nadiifiyaan grid‑ka; haddana ogol “custom time” si dabacsanaanta u sii jirto (column cusub auto soo muuqda marka time cusub la keeno).

Roadmap Kooban
1. Model + Endpoints + GS/Teacher conflicts.
2. UI filters + grid render + Add single slot.
3. Bulk days + edit/delete + toasts.
4. Time buckets config + print/export.
5. Teacher view + polish.

Tusaale
- Admin wuxuu doortaa GS: Grade 8 • Morning • Sec 2; Day: Isniin.
- Wuxuu dhigay Column: 13:30 → 14:30; Cell: “Xisaab” + “Mr. Ahmed”.
- Wuxuu ku daray Column 14:30 → 15:30; “Physics” + “Ms. Amina”.
- Haddii Mr. Ahmed uu yaallo GS kale isla 13:30 Isniin → 409 “Teacher has another class in this period.”

Drag‑and‑Drop (Jiid‑oo‑Tuur)

Fikradda Guud
- User‑ku wuxuu jiidaa cell (slot) una tuuraa cell kale si uu u beddelo maalinta ama waqtiga, isagoo validations ku dhaqmaya.

Noocyada DnD
- Move: wareeji slot gudaha GS (beddel day/time).
- Swap (ikhtiyaari): isku beddel laba cell haddii sharciyeysan tahay.
- Copy (ikhtiyaari): koobiyeyn slot (admin‑only) marka furaha lagu hayo.

Validations marka la tuuro
- GS conflict: diid haddii uu jiro slot GS ah oo overlap la sameeya (`newStart < existEnd && newEnd > existStart`).
- Teacher conflict: diid haddii macallinka uu leeyahay cashar kale waqtigaas.
- Room conflict (ikhtiyaari): diid haddii qolku mashquul yahay waqtigaas.
- Qalad kasta → rollback UI + toast 409 fariin cad.

UI Feedback
- Drag start: cell wuxuu qaataa “dragging” style.
- Over target: highlight haddii bannaan; “not‑allowed” haddii conflict la saadaalin karo.
- Drop success: cell cusub muuqda; toast “Slot updated”.
- Drop fail: dib ugu noqosho booskii hore; toast “Teacher has another class in this period.” iwm.

Swap / Move / Cancel (marka cell buuxo)
- Haddii aad ku tuurto slot meel horay u buuxo, UI-gu wuxuu soo bandhigayaa modal yar oo leh 3 badhan:
  - Swap: isku beddel labada slot (atomic server-side) haddii aysan keenin teacher/class/room conflict.
  - Move: waa la diidi karaa (policy) haddii cell buuxo.
  - Cancel: waxba ma dhaco.

Loading (DnD)
- Marka move/swap request socoto, waxaa muuqanaya overlay + spinner (page dhan) si user-ku u ogaado in update socoto.

Flow (DnD)
1. Jiid slot A (Isniin, 13:30–14:30) → ku tuur cell B (Isniin, 14:30–15:30).
2. Frontend: `PATCH /api/timetable/slots/:id` `{ dayOfWeek, startTime, endTime }`.
3. Server: samee validations; 200 ama 409.
4. 200 → grid update + toast; 409 → rollback + toast.

Todolist (Hagayaasha Shaqo)

Backend (API)
- [ ] Model `TimetableSlot` (times)
- [ ] `POST /api/timetable/slots` (single)
- [ ] `POST /api/timetable/slots/bulk` (multi‑days)
- [ ] `GET /api/timetable/slots` (filters)
- [ ] `PATCH /api/timetable/slots/:id` (edit/move)
- [ ] `DELETE /api/timetable/slots/:id`
- [ ] Validations: GS/Teacher/Room conflicts + time range

Frontend (UI)
- [ ] TimetablePage.jsx (Admin view)
- [ ] Filters: Level, Shift, Section, Subject, Days, Start/End, Room
- [ ] Grid component: rows=days, columns=times, cell=subject+teacher
- [ ] Add Slot modal (single)
- [ ] Add Slots modal (multi‑day)
- [ ] Edit/Delete slot actions
- [ ] DnD enable on grid (move/swap optional)
- [ ] Toasts for success/errors

Arrin: Goorma la geeyo DnD?
- Talo: Kadib marka grid‑ka aasaasiga ah shaqeeyo (Stage 2–3), ku dar DnD (Stage 3/4). Marka hore abuuri/daawo slots si cad; kadib u rar DnD si aad u yareyso khatar iyo jahawareer.
