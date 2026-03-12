# Deployment Prep Checklist — Nuuru Al-Bayaan

Qoraalkan wuxuu ururinayaa waxyaabaha ugu muhiimsan ee mashruuca ka dhigaya **nadiif, ammaan, performant, oo deploy-ready** — iyada oo aan la go'aaminin cloud/provider gaar ah.

Ujeeddo: marka mashruuca la nadiifiyo oo standards-kiisa la hagaajiyo, kadib ayaa la dooran karaa meesha la saarayo (hal meel ama labo meel), adigoo aan dib u refactor weyn u baahnayn.

## 1) Repo hygiene (nadiifinta repo-ga)

- Ka saar artifacts/debug outputs (build/test capture files) repo-ga.
- Ku dar `.gitignore` patterns si aysan mar kale u soo galin.
- Ha commit-gareyn `.env` ama secrets; isticmaal `.env.example` oo nadiif ah.

## 2) Backend: production start script

Hadda `backend/package.json` wuxuu leeyahay `npm run server` oo ku socda `nodemon`, taasina production kuma habboona.

Waxa la rabo in la yeesho script cad sida:

- `start`: `node server.js`
- (ikhtiyaari) `start:prod`: `NODE_ENV=production node server.js`

## 3) Kala saar env-yada (dev / staging / prod)

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

## 4) Go'aan ka gaara uploads

Hadda sawirrada iyo library files-ku waxay ku qoran yihiin local disk backend-ka.

Taasi waxay keenaysaa in:

- server replacement/rebuild uu halis gelin karo files-ka
- scaling dambe uu adkaado

Labada waddo ee hadda macquulka ah:

1. Bilow ahaan isticmaal persistent disk/VPS storage.
2. Mustaqbalka u rara object storage sida S3-compatible storage.

## 5) Go'aan ka gaara realtime

Maaddaama realtime-ku hadda ku dhisan yahay in-memory bus gudaha backend-ka, production-ka ugu fudud waa:

- `single backend instance`

Haddii mustaqbalka la rabo multiple backend instances, waxaa loo baahan doonaa:

- Redis pub/sub ama event bus shared ah

## 6) Yaree frontend bundle-ka (performance)

Frontend build-ku wali wuxuu bixiyaa warnings ku saabsan chunk sizes waaweyn.

Tani:

- deploy ma joojinayso
- laakiin performance ayay saameyn kartaa

Marka waa optimization task, blocker ma aha.

## 7) Healthcheck + smoke checks

Waa in la yeeshaa hab cad oo deployment kadib lagu xaqiijiyo in system-ku shaqeynayo.

Waxyaabaha ugu yar ee la hubinayo:

- backend running
- database connected
- frontend can reach `/api`
- login works
- uploads load correctly
- realtime/SSE works

## 8) Nadiifi scripts-ka ku meelgaarka ah iyo artifact files-ka

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

## 9) Samee deployment document rasmi ah (provider-neutral)

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

## Gunaanad kooban

Waxa ugu muhiimsan hadda ma aha cloud-ka la doorto, ee waa:

- Repo-ga iyo docs-ka in la nadiifiyo
- Secrets/env in la adkeeyo (hardcoding la yareeyo)
- Build/lint/tests in ay 100% green yihiin
- Uploads + realtime in si cad loo qeexo constraints-kooda

Marka checklist-kan la dhameeyo, deploy-ku wuxuu noqonayaa “choose-a-target” halkii uu ka ahaan lahaa “refactor-first”.