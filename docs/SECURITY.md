# Amniga (Security Notes)

## Ilaalinta Hadda
- Validation & sanitization: search regex escaped
- Bounds on pagination: limit ≤ 100
- Unique constraints: (student, academicYear) enrollment; subjectCode; studentId
- Error messages cad (409 conflicts for duplicates)

## Talooyin Mustaqbal
- AuthN/AuthZ (JWT + roles)
- Helmet + Rate Limit + CORS tighten
- Audit log (reassign, CRUD)
- Input schema validation (Joi/Zod) server-wide
- Backup & restore policy (Mongo Atlas)
