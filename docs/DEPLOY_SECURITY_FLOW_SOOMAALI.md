# Nuuru Al‑Bayaan: Auth/Cookies/JWT Flow + Deploy Security Guide (Soomaali)

Qoraalkan wuxuu sharxayaa:
- Sida **login → cookie JWT → requests** u shaqeeyaan mashruuceena.
- Waxa JWT‑ga uu xambaarsan yahay (iyo in uusan xambaarsan wax sir ah).
- Sida aan uga hortagno weerarada caanka ah (CSRF, brute force, session hijack, iwm).
- Waxa la dejinayo marka la deploy‑gareynayo (Render/Heroku/DigitalOcean/Nginx/Hostinger) iyo sida domain/DNS loo xiro.

---

## 1) Anaga nuucee auth/cookie ayaan isticmaalnaa?
Mashruuceenu wuxuu isticmaalaa **JWT** oo lagu keydiyo **HttpOnly cookie**.

- Cookie name: `auth_token`
- Token type: `JWT` (JSON Web Token)
- Storage: browser cookie (httpOnly)
- Server verifies: `JWT_SECRET`

**Maxaa fiican?**
- HttpOnly cookie → JavaScript kama akhrin karo token‑ka (XSS haddii dhacdo, token si fudud looma xadi karo).
- HTTPS + Secure cookies → token‑ka wuu ammaan badan yahay marka internetka la maraayo.

---

## 2) JWT maxaa la yiraahdaa? maxaase uu xambaaraa?
**JWT = JSON Web Token**.

JWT inta badan waa **signed** (la saxiixay), ma aha “encrypted”.
- Signed: token‑ka lama beddeli karo haddii aadan haysan `JWT_SECRET`.
- Not encrypted: haddii qof helo token‑ka, payload‑ka waa la akhrin karaa (taasoo sabab u ah in aanan JWT ku ridin sir).

### JWT‑ga mashruuceena waxa uu xambaarsan yahay (payload)
Backend‑ka wuxuu sameeyaa token sidan u eg:
- `id`: user id (MongoDB `_id`)
- `username`: username/StudentID (aqoonsi)
- `role`: `admin | staff | teacher | student | ...`
- `v`: tokenVersion (global logout/session invalidation)

**Waxyaabaha uusan JWT‑gu xambaarsanayn (waa muhiim):**
- password
- MongoDB URL
- JWT_SECRET
- permissions full object (permissions waxaa lagu xakameeyaa server‑side)

**Qiimeyn amni:** payload‑kan ma aha “sir” (waa identity/role/version) → sidaas darteed caadi/standard ayuu u yahay.

---

## 3) Flow‑ga login ilaa request‑yada (client/browser/server)
Hoos waa flow‑ga dhabta ah ee dhacaya:

### A) Login (browser + frontend)
1. User wuxuu frontend‑ka geliyaa `username/studentId` + `password`.
2. Frontend (React) wuxuu diraa:
   - `POST /api/auth/login`
   - body: `{ username, password }`

### B) Server (backend + MongoDB)
3. Server‑ku wuxuu raadiyaa user‑ka (Admin/User/Teacher fallback).
4. Wuxuu sameeyaa password check (bcrypt compare haddii hashed).
5. Haddii sax yahay:
   - Server‑ku wuxuu abuuraa JWT payload (id, username, role, v)
   - Wuxuu ku saxiixaa `JWT_SECRET`
   - Wuxuu dhigaa cookie: `auth_token=<JWT>`

### C) Browser
6. Browser‑ku cookie‑ga si automatic ah ayuu u kaydiyaa (Set‑Cookie).

### D) Requests‑ka xiga
7. Markasta oo browser‑ku u diro request `/api/...`:
   - cookie‑ga `auth_token` si automatic ah ayuu u raacaa request‑ka.
8. Backend‑ku wuxuu sameeyaa:
   - `jwt.verify(token, JWT_SECRET)`
   - hubin `tokenVersion` (global logout)
   - hubin account security lock (haddii 24h lock active)
   - kadib `req.user` ayuu dhigaa (Admin/User document)

---

## 4) Sidee “xogta” loo amniyeeyaa?
### HTTPS (encryption inta la safarayo)
- HTTPS waxay encrypt‑gareysaa data‑da browser ↔ server.
- Taasi waxay ka hortagtaa in WiFi/ISP qof dhexda jooga uu akhriyo password/token.

### Password hashing (DB gudaheeda)
- Password‑yada DB waa **hash** (bcrypt), ma aha plain text.

### JWT signature
- JWT‑ga waa signed → attacker ma beddeli karo role/id.

### HttpOnly cookie
- JS (frontend code) ma akhrin karto cookie‑ga auth.

---

## 5) Sidee uga hortagnaa attackers?
### 5.1 Brute force / password guessing
- Rate limiting (login + API)
- Progressive throttling + cooldown + 24h lock

### 5.2 Session hijack (token la xado)
- `HttpOnly` + `Secure` cookies (prod)
- Token expiry (`expiresIn`)
- Global logout: `tokenVersion` → haddii user logout sameeyo, token‑kii hore wuu invalid noqdaa

### 5.3 CSRF (cookie auth risk)
Cookie auth‑ku wuxuu leeyahay CSRF risk maxaa yeelay browser‑ku cookie‑ga si automatic ah ayuu u diraa.

Waxaan isticmaalnaa **double‑submit CSRF**:
- Server‑ku wuxuu bixiyaa CSRF token (cookie ama response)
- Frontend‑ku wuxuu ku diraa header `X-CSRF-Token` marka uu sameynayo `POST/PUT/DELETE`
- Server‑ku wuxuu hubiyaa token‑ka header‑ka iyo cookie‑ga inay is waafaqaan

### 5.4 CORS misuse
- `CORS_ORIGIN` allowlist (kaliya origins la oggol yahay)
- `credentials: true` (cookie auth) → waa in allowlist‑ku sax noqdaa

---

## 6) Erayada muhiimka ah (TRUST_PROXY, CORS_ORIGIN, SameSite, HTTPS)
### TRUST_PROXY
Macne: Backend‑ku ma aaminsan yahay reverse proxy (Nginx/Render/Heroku) inuu siiyo IP‑ga user‑ka?

- Haddii aad reverse proxy leedahay, IP‑ga dhabta ah wuxuu ku iman karaa `X-Forwarded-For`.
- `TRUST_PROXY=1` → Express wuxuu aqbalaa forwarded headers.

Goorma shid?
- Render/Heroku/DO + Nginx/Cloudflare → badanaa HAA.

Goorma ha shidin?
- Haddii backend‑ku si toos ah internet u yaallo adigoon proxy lahayn.

### CORS_ORIGIN
Macne: Frontend domains kee ayaa loo oggol yahay inay backend‑ka la hadlaan?

Tusaale:
- `CORS_ORIGIN=https://app.example.com`

### SameSite
Macne: Cookie‑gu ma raaci karaa cross‑site requests?

- `strict`: amni badan
- `lax`: default fiican
- `none`: cross‑site allowed (waa in `COOKIE_SECURE=1`)

Fiiro: `app.example.com` iyo `api.example.com` badanaa waa **same‑site** (registrable domain waa `example.com`), sidaas darteed `lax/strict` marar badan way shaqeeyaan.

### HTTPS
Macne: encryption browser ↔ server.
- Production: waa shardi.

---

## 7) Deploy: maxaa lagu dejinayaa? (Beginner guide)
Qaybtaan waa “what to do” marka aad rabto inaad mashruuca online dhigto.

### 7.1 Waxyaabaha aad u baahan tahay
- MongoDB production (MongoDB Atlas ama server DB)
- Backend hosting (Render/Heroku/DigitalOcean/Hostinger/VPS)
- Frontend hosting (Vercel/Netlify/Render static/Nginx)
- Domain (Namecheap/name.com iwm)

### 7.2 Environment variables (backend)
Deji env vars (production) – ku jiraan platform‑ka aad deploy‑gareyneyso:
- `NODE_ENV=production`
- `JWT_SECRET=<random dheer>`
- `MONGODB_URI=<mongodb connection string>`
- `CORS_ORIGIN=<frontend url(s)>`
- `COOKIE_SECURE=1`
- `COOKIE_SAMESITE=lax` (haddii same‑site) ama `none` (haddii cross‑site)
- `COOKIE_DOMAIN=.example.com` (optional, haddii aad rabto subdomains sharing)
- `TRUST_PROXY=1` (haddii reverse proxy jiro)

### 7.3 Platform notes (mid walba maxaa u gaar ah?)
#### A) Render
- Backend: Web Service
  - Set env vars (dashboard)
  - Set `TRUST_PROXY=1` (Render behind proxy)
- Frontend: Static site ama Vercel/Netlify
- Haddii frontend iyo backend domains kala duwan yihiin:
  - `COOKIE_SAMESITE=none`
  - `COOKIE_SECURE=1`

#### B) Heroku
- Similar to Render
- `TRUST_PROXY=1`
- Set env vars via Config Vars

#### C) DigitalOcean (Droplet/VPS) + Nginx
- You run Node server (pm2/systemd)
- Nginx acts as reverse proxy
- You manage TLS via Let’s Encrypt
- Settings:
  - `TRUST_PROXY=1`
  - Nginx must forward headers: `X-Forwarded-For`, `X-Forwarded-Proto`

#### D) Hostinger (shared hosting vs VPS)
- Shared hosting badanaa Node support waa xaddidan
- VPS plan haddii aad rabto Node + Nginx + SSL
- Haddii shared hosting → front only (static) way fududahay, backend ku dhaji meel kale

---

## 8) Domain/DNS: Namecheap/name.com sidee loo xiraa?
Tusaale qaab nadiif ah oo recommended:
- Frontend: `app.example.com`
- Backend: `api.example.com`

DNS records:
- `app`:
  - haddii Vercel/Netlify → CNAME record (tusaale `app -> cname.vercel-dns.com`)
- `api`:
  - haddii Render/Heroku → CNAME record (tusaale `api -> your-service.onrender.com`)
  - haddii VPS → A record (api -> server IP)

TLS/HTTPS:
- Vercel/Netlify/Render/Heroku badanaa auto‑TLS
- VPS: Let’s Encrypt via Nginx

---

## 9) Security checklist kahor deploy
- Hubi `JWT_SECRET` inuu random dheer yahay (ha noqon default).
- Hubi MongoDB user/password rotation haddii hore loo isticmaali jiray.
- Hubi `COOKIE_SECURE=1` prod.
- Hubi `CORS_ORIGIN` inuu yahay allowlist sax ah.
- Hubi `COOKIE_SAMESITE` inuu ku habboon yahay topology‑gaaga (same‑site vs cross‑site).
- Hubi `TRUST_PROXY` kaliya haddii proxy jira.

---

## 10) Jawaab kooban: “JWT‑geena halis ma xambaaraa?”
JWT‑geena waxa uu xambaarsan yahay: `id`, `username`, `role`, `v`.
- Ma xambaarsana password ama secrets.
- Sidaas darteed **halis sir‑leak** ma xambaarsana.
- Halisdu waxay timaadaa keliya haddii token‑ka la xado (session hijack), taas oo aan uga hortagno: HttpOnly + Secure + CSRF + throttling + tokenVersion invalidation.
