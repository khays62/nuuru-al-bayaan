# Amniga (Security Notes)

## Dukumenti Rasmi ah (AuthZ)
- Authorization/Permissions policy + matrix + drift: [docs/AUTHORIZATION.md](AUTHORIZATION.md)

## Ilaalinta Hadda
- Validation & sanitization: search regex escaped
- Bounds on pagination: limit ≤ 100
- Unique constraints: (student, academicYear) enrollment; subjectCode; studentId
- Error messages cad (409 conflicts for duplicates)

## Waxyaabo dhawaan la adkeeyey
- User Management permissions payload allowlist (unknown module/action → 400)
- Audit trail (mutating requests) + permission context via `req.audit`

## Talooyin Mustaqbal
- AuthN/AuthZ (JWT + roles)
- Helmet + Rate Limit + CORS tighten
- Audit log (reassign, CRUD)
- Input schema validation (Joi/Zod) server-wide
- Backup & restore policy (Mongo Atlas)
