# USER MANAGEMENT — EDCI (SSE + TanStack Query) Warbixin (Af‑Soomaali)

## 1) Ujeeddo
Feature‑ka **User Management** (staff/admin accounts) waxaa lagu dabaqay pattern‑ka mashruuca ee:

**Realtime (SSE) → Frontend Events → Invalidate Queries → UI updated**

Tani waxay ka dhigaysaa:
- In isbeddel kasta (create/update/delete/status toggle/reset lockout) uu si toos ah uga muuqdo tabs/browsers kale.
- In UI‑ga uusan ku tiirsanaan “manual fetch + local state refresh”, balse uu ku tiirsanaado React Query cache.
- In refetch‑yada loo maamulo si nadiif ah (debounced search, placeholderData, staleTime).

## 2) Frontend: Waxa la beddelay
### A) Query Keys (centralized)
Waxaa la ballaariyey keys‑ka User Management si invalidation‑ku u noqdo granular:
- `adminListBase`, `adminList({search,role,status})`
- `adminProfileBase`, `adminProfile(userId)`
- `adminAuditLogsBase`, `adminAuditLogs({userId,page,limit})`

Fayl: frontend/src/features/users/queryKeys.js

### B) Realtime invalidation hook
Waxaa la sameeyey hook cusub:
- `useUsersRealtimeInvalidation({ userId? })`
- Dhageysta `EVENTS.USERS_CHANGED`
- Invalidates:
  - mar kasta: `adminListBase`
  - haddii `userId` la siiyo oo event‑ku wato `id` la mid ah: `adminProfile(userId)` iyo `adminAuditLogsBase`

Fayl: frontend/src/features/users/useUsersRealtimeInvalidation.js

### C) User Management Page (List + Create/Edit/Toggle/Reset)
UserManagementPage waxaa laga beddelay “manual fetch + event listener” loona rogay:
- `useQuery` (list) oo adeegsata `userKeys.adminList(...)`
- `useMutation` (create/update/toggle/resetLockout)
- `invalidateQueries` onSuccess
- `useDebounce(search, 350)` si aan request‑yo badan u cancel noqon marka la typing‑gareeyo
- Waxaa laga saaray ku tiirsanaanta `window.dispatchEvent('users:changed')`

Fayl: frontend/src/features/users/pages/UserManagementPage.jsx

### D) User Profile Page (Profile + Audit Logs)
UserProfilePage waxaa loo rogay:
- `useQuery` profile: `userKeys.adminProfile(userId)`
- `useQuery` logs: `userKeys.adminAuditLogs({userId,page,limit})`
- `useUsersRealtimeInvalidation({ userId })` si profile/logs u refresh‑gareeyaan marka user‑kaas la beddelo

Fayl: frontend/src/features/users/pages/UserProfilePage.jsx

### E) usersApi (AbortSignal + no local events)
usersApi waxaa loo habeeyey React Query:
- `listUsers(params, { signal })`
- `getUserById(id, { signal })`
- `getUserAuditLogs(id, params, { signal })`
- Waxaa laga saaray `window.dispatchEvent(new CustomEvent('users:changed'))` (EDCI wuxuu ku tiirsan yahay SSE + invalidation hook)

Fayl: frontend/src/features/users/api/usersApi.js

## 3) Backend: Realtime publish coverage
UserController horey ayuu u publish‑gareynayay `users:changed` create/update/delete/toggle.
Waxaa hadda la dhammeystiray event‑ka **reset lockout** (AuthController):
- `publishRealtime({ type: 'users:changed', id, ts })`
- `publishRealtime({ type: 'security:authLocksChanged', ts })`

Fayl: backend/controllers/authController.js

## 4) Sidee Realtime‑ku u shaqeeyaa (flow)
1. Backend write action (tusaale: update user) → `publishRealtime({ type: 'users:changed', id })`
2. SSE stream (frontend) → realtimeDispatcher → `emitUsersChanged({ source:'realtime', id, ... })`
3. `useUsersRealtimeInvalidation` → `invalidateQueries(...)`
4. React Query → refetch (active queries) → UI updated (list/profile/logs)

## 5) Waxyaabaha la ilaalshay (non‑breaking)
- UI layout, filters, modal form iyo permission checkboxes waa la ilaalshay.
- Search/filter logic waa la sii hayey, laakiin request‑yada waa la yareeyey (debounce + staleTime).
- Backward compatibility: keys‑kii hore (`list/detail/logs`) wali way jiraan gudaha queryKeys.

## 6) Verify / Tijaabo (Smoke checklist)
1. Fur `/users` laba browser/tab.
2. Samee:
   - Create user
   - Update user permissions
   - Toggle active/inactive
   - Reset login lockout
3. Hubi in tab‑ka kale UI‑gu iskiis u refresh‑gareeyo (no manual refresh).
4. Tag `/users/:id` (profile) oo tab kale ka beddel user‑kaas → profile + audit logs waa inay update noqdaan.

## 7) Qodobyo xiga (optional improvements)
- Haddii la rabo, `setQueryData` (optimistic) ayaa lagu dari karaa create/update si UI‑gu u noqdo “instant” xitaa ka hor refetch.
- Waxaa la kala dhigi karaa list paging server‑side haddii users‑ku bato (page/limit API).

---
Warbixintan waxay raacday pattern‑kii Students/Teachers ee EDCI, iyadoo aan la jabin behavior‑ka mashruuca.
