# Sida Loo Galo Wadashaqeynta (Contributing Guide)

Ku soo dhawoow mashruuca **Nuuru Al-Bayaan**! Waxaanu ku faraxsanahay in aad nala wadashaqeyso.
Dukumentigan wuxuu sharxayaa sida loo soo gudbiyó fikrad, bug, ama code change.

---

## 📋 Qaababka Guud ee Wadashaqeynta

### 1. Issue Fur Marka Hore
Kahor intaadan code wax ku beddelin, fur **Issue** si aan isugu weydiino:
- Khaladka aad aragtay (bug)
- Astaamaha cusub ee aad rabtid (feature)
- Wax kasta oo aad fahmin karin

### 2. Fork iyo Branch
```bash
# Clone mashruuca
git clone https://github.com/khays62/nuuru-al-bayaan.git
cd nuuru-al-bayaan

# Branch cusub abuur
git checkout -b feature/magaca-astaamaha
# ama
git checkout -b fix/sharaxaad-khaladka
```

**Magacyada branch-ka:** isticmaal qaabkan:
- `feature/` — astaan cusub
- `fix/` — bug-fix
- `docs/` — wax loo beddelay dukumentiga kaliya
- `refactor/` — dib-u-habayn aan wax shaqo cusub ah laheyn

### 3. Backend
```bash
cd backend
npm install
npm run server   # http://localhost:7000
```

> Samee `backend/.env` — eeg `docs/SETUP.md` faahfaahinta.

### 4. Frontend
```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

> Samee `frontend/.env.development` — eeg `docs/SETUP.md`.

### 5. Tijaabooyin (Tests)
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

Hubi in dhammaan tijaabiyada ay guulaysteen kahor intaadan Pull Request soo gudbinin.

---

## 🔀 Pull Request (PR) Gudbinta

1. Hubin in branch-kaagu updated yahay oo aanad ka hormarin `main`:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
2. Push gareey:
   ```bash
   git push origin feature/magaca-astaamaha
   ```
3. Fur PR GitHub-ka waxaadna buuxisaa template-ka PR.
4. Sug review — waxaan ku jawaabi doonaa 1–3 maalmood gudahood.

### PR-ga Wanaagsan waxa uu leeyahay:
- Sharaxaad kooban oo cad oo ah waxa la bedelay iyo sababta
- Screenshots/GIFs haddii UI la bedelay
- Tests cusub ama tests la cusbooneysiiyay
- Dukumenti la cusbooneysiiyay haddii API ama flow wax loo bedelay

---

## 🗂️ Qaab-dhismeedka Mashruuca

```
nuuru-al-bayaan/
├── backend/          # Node.js + Express + Mongoose
│   ├── controllers/  # Request handlers
│   ├── models/       # Mongoose schemas
│   ├── routes/       # API routes
│   ├── services/     # Business logic
│   ├── middleware/   # Auth, CSRF, rate-limit, i18n
│   └── tests/        # Jest tests
├── frontend/         # React + Vite + Tailwind
│   └── src/
│       ├── features/ # Feature-based modules
│       └── shared/   # Reusable components, hooks, API
└── docs/             # Dukumentiga (Af-Soomaali)
```

Eeg `docs/ARCHITECTURE.md` faahfaahinta dhammaystiran.

---

## ✏️ Qawaaniinta Code-ka

### Backend (Node.js / ESM)
- Isticmaal `import`/`export` (ESM — `"type": "module"` ayaa ku jira `package.json`)
- Controllers waxay u gudbin karaan xogta services-ka
- Routes waxay isticmaalaan middleware-ka (auth, CSRF, rate-limit)
- Zod-ka isticmaal validation-ka input-ka

### Frontend (React / Tailwind)
- Feature-based folders: code-ga marka la daayo wuu la socdaa feature-kiisa
- `shared/api/http.js` (`fetchJson` + `apiUrl`) isticmaal, ha abuurin fetch cusub
- UI primitives: `shared/components/ui/*` isticmaal (Button, Input, Modal, Badge, iwm.)
- Table: `StandardTable` / `DataTable` isticmaal

### Luqadda
- **UI:** English
- **Dukumentiga:** Af-Soomaali

---

## 🐛 Sida Loo Soo Gudbiyo Bug

Isticmaal template-ka **Bug Report** Issue-ka. Ku dar:
1. Waxa aad samaynaysay
2. Waxa aad filaysay in dhacdo
3. Waxa dhab ahaantii dhacay
4. Screenshots (haddii jiraan)
5. Browser + OS

---

## 💡 Sida Loo Soo Gudbiyo Astaan Cusub (Feature Request)

Isticmaal template-ka **Feature Request** Issue-ka. Ku dar:
1. Dhibaatada astaamahan xallinayso
2. Sida ay u shaqeyso ee aad rabtid
3. Beddalaha kale ee aad u fikiraysay

---

## 🤝 Nala Xiriir

Haddii su'aal kuu tahay, fur [Issue](https://github.com/khays62/nuuru-al-bayaan/issues) ama nala xiriir toos.

Mahadsanid wadashaqeyntaada! 🌟
