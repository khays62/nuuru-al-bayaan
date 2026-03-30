# Hostinger VPS Deployment Checklist — Nuuru Al-Bayaan (Nginx + SSL + PM2 + DNS)

Qoraalkan waa checklist “step-by-step” ah oo loogu talagalay **Hostinger VPS** (Linux) adigoo isticmaalaya:
- **Nginx** (reverse proxy + frontend static)
- **Let’s Encrypt SSL** (Certbot)
- **PM2** ama **systemd** (backend process manager)
- **DNS** (domain → VPS IP)

> Ujeeddo: in frontend + backend ay noqdaan **same-origin** (domain keliya), si cookie-auth + CSRF + SSE ay u noqdaan kuwo fudud oo ammaan ah.

---

## 0) Go’aamada ugu muhiimsan (recommended)

### A) Topology (fudud oo ammaan ah)
- Frontend: `https://YOUR_DOMAIN/`
- Backend API: `https://YOUR_DOMAIN/api` (Nginx proxy → `http://127.0.0.1:7000`)

Tani waxay ka fogeyneysaa cross-site cookie dhibaatooyinka (`SameSite`, `Secure`, CORS).

### B) Database
- **Recommended**: MongoDB Atlas (ama DB service kale) si VPS-ka uusan u qaadin DB maamulka.
- Haddii DB VPS-ka la saaro: u baahan hardening + backups + monitoring (qoraalkan kuma faahfaahinayo).

---

## 1) DNS (domain → VPS)

### A) A records (root domain)
- `@` → `YOUR_VPS_PUBLIC_IP`
- `www` → `YOUR_VPS_PUBLIC_IP` (optional)

> Haddii aad rabto subdomains (ikhtiyaari): `api` → IP, `app` → IP. Laakiin same-origin `/api` ayaa ka sahlan.

Sug propagation (mararka qaar 5–60 daqiiqo, mararka qaar saacado).

---

## 2) VPS diyaarinta (Ubuntu/Debian)

### A) Update + tools
- `sudo apt update ; sudo apt -y upgrade`
- `sudo apt -y install git nginx`

### B) Firewall (UFW)
- `sudo apt -y install ufw`
- `sudo ufw allow OpenSSH`
- `sudo ufw allow 'Nginx Full'`
- `sudo ufw enable`

> Hubi in port-ka backend (7000) uusan public u furneyn; waa inuu ku ekaadaa localhost.

### C) Node.js
Hostinger VPS badanaa waa Ubuntu/Debian:
- Ku rakib Node LTS (tusaale 20.x) adigoo adeegsanaya NodeSource ama distro packages.

---

## 3) Deploy code (repo clone + install)

### A) Folder structure
Tusaale:
- `/var/www/nuuru-al-bayaan/` (repo)
- `/var/www/nuuru-al-bayaan/frontend/dist/` (static build output)

### B) Clone
- `cd /var/www`
- `sudo git clone <YOUR_GITHUB_REPO_URL> nuuru-al-bayaan`
- `sudo chown -R $USER:$USER /var/www/nuuru-al-bayaan`

### C) Install dependencies
Backend:
- `cd /var/www/nuuru-al-bayaan/backend`
- `npm ci`

Frontend:
- `cd /var/www/nuuru-al-bayaan/frontend`
- `npm ci`
- `npm run build`

---

## 4) Backend ENV (production)

Samee `backend/.env` (ha commit-gareyn). Waxaad ka bilaabi kartaa template-ka `backend/.env.example`.

**Minimum recommended (production):**
- `NODE_ENV=production`
- `PORT=7000`
- `MONG_URL=...` (Atlas/production DB)
- `JWT_SECRET=...` (random dheer)
- `CORS_ORIGIN=https://YOUR_DOMAIN`
- `COOKIE_SECURE=1`
- `COOKIE_SAMESITE=strict` (same-origin; haddii aad kala domain sameyso, waxaa laga yaabaa `none`)
- `TRUST_PROXY=1` (maadaama Nginx uu proxy yahay)

**Uploads (Backblaze B2) — haddii aad isticmaaleyso remote uploads (recommended):**
- `UPLOADS_DRIVER=b2`
- `B2_KEY_ID=...`
- `B2_APPLICATION_KEY=...`
- `B2_ENDPOINT=...` (tusaale: `https://s3.us-east-005.backblazeb2.com`)
- `B2_REGION=us-east-005`
- `B2_BUCKET_NAME=...`

> Waxaad ka bilaabi kartaa template-ka `backend/.env.example`.

---

## 5) Process manager (PM2) — recommended

### A) Install PM2
- `sudo npm i -g pm2`

### B) Start backend
- `cd /var/www/nuuru-al-bayaan/backend`
- `pm2 start server.js --name nuuru-backend`

### C) Autostart (boot)
- `pm2 startup`
- Raac command-ka uu kuu soo saaro (sudo...)
- `pm2 save`

> Alternative: waxaad isticmaali kartaa `systemd` haddii aad doorbideyso.

---

## 6) Nginx config (frontend + /api proxy)

### A) Samee site config
- `sudo nano /etc/nginx/sites-available/nuuru-al-bayaan`

Tusaale config (same-origin):

```
server {
  listen 80;
  server_name YOUR_DOMAIN www.YOUR_DOMAIN;

  root /var/www/nuuru-al-bayaan/frontend/dist;
  index index.html;

  # SPA routing
  location / {
    try_files $uri $uri/ /index.html;
  }

  # API proxy
  location /api/ {
    proxy_pass http://127.0.0.1:7000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # SSE (realtime) — haddii aad leedahay endpoint /api/realtime/stream
  location = /api/realtime/stream {
    proxy_pass http://127.0.0.1:7000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
  }
}
```

### B) Enable site
- `sudo ln -s /etc/nginx/sites-available/nuuru-al-bayaan /etc/nginx/sites-enabled/nuuru-al-bayaan`
- `sudo nginx -t`
- `sudo systemctl reload nginx`

---

## 7) SSL (Let’s Encrypt / Certbot)

- `sudo apt -y install certbot python3-certbot-nginx`
- `sudo certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN`

Auto-renew test:
- `sudo certbot renew --dry-run`

---

## 8) Smoke checks (kadib deploy)

### A) Nginx
- `curl -I http://YOUR_DOMAIN/`

### B) Backend reachability (via Nginx)
- `curl -i https://YOUR_DOMAIN/api/auth/verify`

### C) App flow
- Open browser: `https://YOUR_DOMAIN/`
- Login
- Hubi:
  - CSRF works (POST/PUT/DELETE)
  - Cookies are set (Secure)
  - Uploads (B2) load via `/api/uploads/...`
  - SSE realtime works

---

## 9) Updates / redeploy (marka code la cusbooneysiiyo)

- `cd /var/www/nuuru-al-bayaan ; git pull`
- `cd backend ; npm ci ; pm2 restart nuuru-backend`
- `cd ../frontend ; npm ci ; npm run build`
- `sudo systemctl reload nginx`

---

## 10) Haddii aad rabto systemd (alternative)

PM2 waa fudud, laakiin systemd waa “standard Linux”. Haddii aad rabto, waxaan kuu diyaarin karaa:
- `nuuru-backend.service`
- env file placement (`/etc/nuuru-backend.env`)
- restart policy + logs
