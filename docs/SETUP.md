# Setup (Windows) — For Teammates

Kuwan raac si aad mashruuca u socodsiiso gudaha Windows. Haddii wax kaa istaagaan, fadlan akhri khaladka la soo saaray iyo talaabooyinkan dib ugu noqo.

## 1) Ku rakib shuruudaha
- Node.js 18+
- MongoDB (Atlas ama Local)

## 2) Backend — diyaari .env
`backend/.env` abuur oo geli labadan variable:

```env
PORT=7000
MONG_URL=mongodb://127.0.0.1:27017/nuuru_al_bayaan  # ama MongoDB Atlas URI-gaaga
```

Haddii aad isticmaaleyso Atlas, hubi in IP-gaaga la oggolaaday (whitelist). Tijaabo ahaan 0.0.0.0/0 waa la isticmaali karaa, balse kadib ka saar.

## 3) Frontend — diyaari .env
`frontend/.env.example` ka nuqul garee `.env.development`, kadib wax ka beddel:

```powershell
Copy-Item .env.example .env.development
```

`frontend/.env.development` ku qor:

```env
VITE_API_BASE_URL=http://localhost:7000/api
```

Ikhtiyaari (production build): `frontend/.env.production`

```env
VITE_API_BASE_URL=/api
```

Ogow: Kaliya variables ka bilaabma `VITE_` ayaa browser-ka la wadaagaa; ha gelin sir frontend `.env*`.

## 4) Ku orod Backend

```powershell
cd backend
npm install
npm run server
```

Server-ku waxa uu ordaa: http://localhost:7000

## 5) Ku orod Frontend

```powershell
cd frontend
npm install
npm run dev
```

Fur browser: http://localhost:5173

## 6) Haddii dhibaato timaado
- 500 errors? Hubi `MONG_URL` sax ma yahay iyo Atlas IP whitelist.
- API requests ayaa dhici la’? Hubi `VITE_API_BASE_URL` iyo in backend ordayo 7000.
- HMR/Cache qaldan? Hard refresh (Ctrl+F5).
