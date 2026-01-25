# Announcements

Last updated: 25 Jan 2026

Announcements waa farriimo guud oo ka muuqda nidaamka (admin/staff/teacher waxay qori karaan; users-ka authenticated way arki karaan).

---

## Model
`Announcement`
- `title` (required)
- `body` (required)
- `author` (string; username)
- `role` (string)
- `date` (Date)

---

## API
Base: `/api/announcements`

- `GET /api/announcements`
  - Auth: required (any authenticated user)
  - Returns: list (latest first)

- `POST /api/announcements`
  - Permission: `announcements:add`
  - Body: `{ title, body }`

- `PUT /api/announcements/:id`
  - Permission: `announcements:edit`
  - Body: `{ title, body }`

- `DELETE /api/announcements/:id`
  - Permission: `announcements:delete`

---

## Frontend (Notes)
- Feature: `frontend/src/features/announcements/*`
- Typical UI:
  - List view (cards/table)
  - Create/Edit modal
  - Delete confirm

---

## Security
- Read-only for all authenticated users.
- Write endpoints are permission-gated.
