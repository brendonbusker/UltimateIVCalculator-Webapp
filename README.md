# Ultimate IV Calculator Web App

This is a full-stack starter based on the desktop CustomTkinter app the user provided. It preserves the core IV calculation logic while moving the product toward a professional web architecture. built from the current desktop app structure.

## Stack

- Frontend: Next.js + React + TypeScript
- Backend: FastAPI + Pydantic
- Deployment target: Vercel (frontend) + Render (backend)

## Project structure

```text
iv-webapp/
  backend/
  frontend/
```

## Local development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

## Environment variables

### Frontend

- `NEXT_PUBLIC_API_BASE_URL` – backend API base URL, defaults to `http://localhost:8000/api`

## Current MVP features

- Pokémon search autocomplete
- live Pokémon summary loading
- exact IV calculation API
- dark/light/system theme toggle with browser persistence
- desktop-inspired dashboard layout
- responsive stacking for narrower screens

## Notes

- The backend still uses live PokeAPI requests for names, Pokémon details, and natures.
- Caching is in place, but longer-term production work should bundle or pre-cache core data.
- This is the first web foundation, not a final production release.
