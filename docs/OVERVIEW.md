# Dulmar Guud (Overview)

Mashruuc: Design and Implementation of a Web-Based Academic Management System for Nuuru Al-Bayaan Islamic Institute

## Ujeeddo iyo Baahi
Nidaamkani waxa uu xallinayaa maaraynta ardayda, fasallada (Grade Sections), iyo maaddooyinka. Waxa uu fududeeyaa:
- Diiwaangelinta ardayda sanad walba (Enrollment)
- Shaandhaynta iyo raadinta xogta ardayda iyo fasallada
- Maareynta maaddooyinka iyo ku xidhitaankooda grades-ka
- Wareejinta (reassign) enrollment-ka marka si qalad ah loo doorto section

## Astaamo Muhiim ah
- Students list leh search, sort, pagination, iyo filters (Academic Year → Grade → Shift → Section)
- Profile-ka ardayga + History (taariikh enrollments)
- Reassign enrollment (xaalad qalad doorasho)
- Grade Sections management (year/grade/shift)
- Subjects management iyo xiriir la leh grades

## Heerka Hadda (MVP)
- Frontend: React + Vite; Tailwind; Toasts; Modal iyo hooks reusable
- Backend: Node.js + Express + Mongoose (MongoDB)
- Xeer ilaalin xog: enrollment unique per (student, academicYear); duplicate person guard (fullName + DOB)
- Favicon iyo polish UI ee profile

## Mustaqbal Gaaban
- Kaabista reports kooban
- Promotions (sanad → sanad)
- Hubsiga amniga iyo logs
