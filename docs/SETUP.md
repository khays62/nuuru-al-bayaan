# Setup (Windows)

## Requirements
- Node.js 18+
- MongoDB Atlas account (ama local MongoDB)

## Environment
- backend/config/config.js → ku dar .env ama config secrets (Mongo URI)
- Haddii Atlas uu xannibo IP-ga, ku dar IP-gaaga ama ku meelgaar 0.0.0.0/0 inta lagu tijaabinayo

## Run
- Backend: `cd backend` → `npm install` → `npm start`
- Frontend: `cd frontend` → `npm install` → `npm run dev` → browser: http://localhost:5173

## Notes
- Haddii aad aragto 500 errors: hubi Mongo URI iyo IP whitelist.
- HMR (Vite) wuxuu dedejiyaa dev; haddii caching la dareemo, refresh hard (Ctrl+F5).
