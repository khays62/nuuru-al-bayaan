# Deployment Prep Note (Temp) — Nuuru Al-Bayaan

Qoraalkan waa note ku-meel-gaar ah oo loogu talagalay diyaarinta deployment-ka mashruuca.

## Qorshaha la Soo Jeediyay

Qorshaha `DigitalOcean marka hore -> Azure kadib` waa qorshe macquul ah.

Sababta uu u fiican yahay hadda:

- DigitalOcean waa sahlan yahay in lagu bilaabo MERN stack, gaar ahaan haddii la rabo `VPS/Droplet + MongoDB + reverse proxy`.
- Student credits-ka waxay kaa caawin karaan bilowga kharashka server-ka iyo adeegyada la xiriira.
- Waxay kuu sahlaysaa inaad system-ka si dhab ah u kiciso, u tijaabiso, u hagaajiso deployment flow-ga, ka hor intaadan gelin Azure oo xoog badan laakiin ka nidaam iyo config badan.
- Mashruucan hadda wuxuu ku habboon yahay hal backend instance oo production ah, taas oo aad ugu fudud DigitalOcean bilow ahaan.

Sababta Azure loo geli karo kadib:

- Marka system-ku xasiloobo oo deployment flow-ga cad noqdo, Azure waxay ku siin kartaa scaling, monitoring, backups, secrets management, iyo enterprise integration ka xoog badan.
- Haddii mustaqbalka school-ku u baahdo infra adag, multiple environments, ama enterprise governance, Azure waa tallaabo macquul ah.

## Talo Pragmatic ah

Haddii hadafku yahay in system-ku si dhaqso leh u galo production ama demo-production:

1. Marka hore ku deploy garee DigitalOcean.
2. Ku hagaaji env, domains, SSL, backups, uploads, iyo logging.
3. Ku socodsii muddo kooban oo tijaabo/stabilization ah.
4. Kadib go'aan ka gaara haddii migration Azure runtii loo baahan yahay.

Fiiro:

- Hubi si gaar ah waxa student credits-kaagu daboolayaan. Mararka qaar credits-ku waxay shaqeeyaan inta badan DigitalOcean services, laakiin waa in benefits page-ka ama billing page-ka laga xaqiijiyaa haddii managed database ama adeeg gaar ah ku jiro.
- Haddii managed database-ka DigitalOcean aanu si fiican ugu habboonayn credits-ka ama plan-ka, MongoDB Atlas waa ikhtiyaarka ugu habboon mashruucan.

## Qaabka Deployment ee Ugu Habboon Mashruucan Hadda

Mashruucan hadda waxaa ugu habboon:

- Frontend: build oo lagu serve gareeyo Nginx ama static hosting gudaha isla server-ka.
- Backend: hal Node.js instance oo ku socda PM2 ama systemd.
- Database: MongoDB Atlas.
- Reverse Proxy: Nginx.
- SSL: Let's Encrypt.

Sababta:

- Backend-ku wuxuu isticmaalaa SSE/realtime oo ku xiran in-memory event bus.
- Uploads-ku hadda waxay ku qoran yihiin local disk.
- Sidaa darteed multi-instance setup hadda ma aha tallaabada koowaad ee ugu fudud.

## Nadiifinta Ugu Muhiimsan Ka Hor Deploy

### 1) Sameeya production start script backend-ka

Hadda `backend/package.json` wuxuu leeyahay `npm run server` oo ku socda `nodemon`, taasina production kuma habboona.

Waxa loo baahan yahay script cad sida:

- `start: node server.js`

## 2) Kala saara env-yada

Waa in si cad loo qeexaa:

- development
- staging
- production

Variables-ka ugu muhiimsan ee la caddeynayo:

- `PORT`
- `MONG_URL`
- `JWT_SECRET`
- `DEFAULT_INITIAL_PASSWORD`
- `CORS_ORIGIN`
- `COOKIE_SECURE`
- `COOKIE_SAMESITE`
- `COOKIE_DOMAIN`
- `TRUST_PROXY`

Ikhtiyaari laakiin faa'iido leh:

- `NODE_ENV`
- logging config
- backup-related envs haddii loo baahdo

## 3) Go'aan ka gaara uploads

Hadda sawirrada iyo library files-ku waxay ku qoran yihiin local disk backend-ka.

Taasi waxay keenaysaa in:

- server replacement/rebuild uu halis gelin karo files-ka
- scaling dambe uu adkaado

Labada waddo ee hadda macquulka ah:

1. Bilow ahaan isticmaal persistent disk/VPS storage.
2. Mustaqbalka u rara object storage sida S3-compatible storage.

## 4) Go'aan ka gaara realtime

Maaddaama realtime-ku hadda ku dhisan yahay in-memory bus gudaha backend-ka, production-ka ugu fudud waa:

- `single backend instance`

Haddii mustaqbalka la rabo multiple backend instances, waxaa loo baahan doonaa:

- Redis pub/sub ama event bus shared ah

## 5) Yareeya frontend bundle-ka

Frontend build-ku wali wuxuu bixiyaa warnings ku saabsan chunk sizes waaweyn.

Tani:

- deploy ma joojinayso
- laakiin performance ayay saameyn kartaa

Marka waa optimization task, blocker ma aha.

## 6) Qora healthcheck iyo smoke checks

Waa in la yeeshaa hab cad oo deployment kadib lagu xaqiijiyo in system-ku shaqeynayo.

Waxyaabaha ugu yar ee la hubinayo:

- backend running
- database connected
- frontend can reach `/api`
- login works
- uploads load correctly
- realtime/SSE works

## 7) Nadiifi scripts-ka ku meelgaarka ah iyo artifact files-ka

Workspace-ka waxaa ku badan:

- `*_latest.txt`
- build diagnostic files
- smoke output files
- temporary verify files

Kuwani deploy blocker ma aha, laakiin repo hygiene ayay wax u dhimayaan.

Waxa fiican in la kala saaro:

- docs rasmi ah
- scripts rasmi ah
- temp/debug artifacts oo la tirtiro ama `.gitignore` lagu daro

## 8) Sameeya hal deployment document oo rasmi ah

Hadda `SETUP.md` wuxuu inta badan diiradda saarayaa local setup.

Waxa loo baahan yahay doc cusub sida:

- `DEPLOY.md`
ama
- `PRODUCTION_SETUP.md`

Doc-gaas waa inuu qeexaa:

- env vars production
- build steps
- backend start steps
- reverse proxy config
- SSL setup
- backup plan
- rollback plan

## Waxyaabaha Gaar ahaan U Baahan Feejignaan

### Cookie auth + CSRF

Haddii frontend iyo backend ay ku kala jiraan domains ama subdomains kala duwan, cookie settings si taxaddar leh baa loo dejinayaa.

### CORS

Production origin-ka saxda ah waa in lagu qoraa env.

- Ha isticmaalin wildcard production.

### Reverse proxy

Haddii Nginx ama cloud proxy la isticmaalo, `TRUST_PROXY=1` waa muhiim si IP-based logic iyo cookies ay si sax ah u shaqeeyaan.

### Backups

MongoDB backup policy waa in la sameeyaa kahor launch.

### Logs

Production logs iyo error capture waa in meel lagu arkaa.

### Seed/admin access

Admin default access iyo initial password waa in si ammaan ah loo maareeyaa.

## Gunaanad Kooban

Qorshaha `DigitalOcean first, Azure later` waa qorshe fiican oo practical ah mashruucan.

Waxa ugu muhiimsan hadda ma aha cloud-ka la doorto oo keliya, ee waa:

- deployment-ka in la fududeeyo
- env-yada in la kala saaro
- uploads/realtime in go'aan laga gaaro
- scripts/docs production in la diyaariyo

Marka kuwaas la xiro, DigitalOcean waxaad ku geli kartaan si nadiif ah. Kadib haddii loo baahdo, Azure migration way fududaanaysaa sababtoo ah architecture-ku mar hore ayuu kala caddaanayaa.