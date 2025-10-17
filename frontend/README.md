# Nuuru Al-Bayaan — Frontend

React 19 + Vite 7 UI for the Nuuru Al-Bayaan system.

## Environment setup

This app reads its API base URL from Vite env variables. The repo ignores actual `.env*` files (see root `.gitignore`). Use the provided template to create your local env files.

1) Copy the example file

```bash
cp .env.example .env.development
```

2) Edit `.env.development` for your local backend

```env
VITE_API_BASE_URL=http://localhost:7000/api
```

3) Production build (optional)

Create `.env.production` when building for production. If you run behind a reverse proxy, `/api` is typical.

```env
VITE_API_BASE_URL=/api
```

Notes:
- Variables must start with `VITE_` to be exposed to the client (Vite behavior).
- Do not put secrets in frontend `.env*` files (they are bundled for the browser). Keep secrets only in the backend environment.

## Scripts

From this folder:

- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint

## Routing and 404

- 404 page is rendered outside the app layout (no Sidebar/Navbar)
- In-app wildcard redirects to `/404` to ensure a clean standalone 404

## API base URL helper

All frontend API calls use an `apiUrl` helper which prefixes paths with `VITE_API_BASE_URL` and normalizes slashes.
