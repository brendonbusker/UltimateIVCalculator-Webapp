# Ultimate IV Calculator Webapp

## Local development

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Production notes

### Frontend hardening
- `frontend/next.config.ts` enables security headers and disables the `X-Powered-By` header.
- Set `NEXT_PUBLIC_API_URL=/api` when the frontend and backend are published behind the same domain.
- Keep `next` patched. The project is currently pinned to `15.5.12`.

### Backend hardening
- Configure production environment variables from `backend/.env.example` in your hosting platform.
- Set `APP_ENV=production` before publishing.
- Set `ALLOWED_HOSTS` to your real domain names.
- Set `ALLOWED_ORIGINS` only if the frontend and backend are on different origins. If they share one domain behind a reverse proxy, same-origin `/api` requests are preferred.
- Runtime-fetched historical cache writes now go to `backend/.runtime/historical_stats.json` by default instead of modifying the bundled seed data file.
- Basic in-memory rate limiting is enabled by default in production.

### Deployment recommendations
- Put the frontend and backend behind HTTPS.
- Terminate TLS at your reverse proxy or platform edge and enable HSTS there.
- Keep API docs disabled in production unless you intentionally want them public.
- Re-run `npm audit` and your production build before each release.

## Notes
- Gen 1 and Gen 2 use DV / Stat Exp rules.
- HP DV is derived from the other DVs in Gen 1-2.
- Gen 1 uses a single Special stat in the UI.
- Characteristics are optional and only active for Gen 4+.
- Bundled historical stats ship in `backend/app/data/historical_stats.json`.
- Runtime historical cache defaults to `backend/.runtime/historical_stats.json`.
- If a generation-specific stat record is missing from the local cache, the backend can fetch and cache it from the MIT-licensed `zhenga8533/pokedb` project.
