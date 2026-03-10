
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

## Notes
- Gen 1 and Gen 2 use DV / Stat Exp rules.
- HP DV is derived from the other DVs in Gen 1-2.
- Gen 1 uses a single Special stat in the UI.
- Characteristics are optional and only active for Gen 4+.
- Historical stats are cached in `backend/app/data/historical_stats.json`.
- If a generation-specific stat record is missing from the local cache, the backend can fetch and cache it from the MIT-licensed `zhenga8533/pokedb` project.
