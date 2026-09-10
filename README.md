# Ultimate IV Calculator Webapp

A generation-aware IV/DV calculator built into a responsive, three-screen Pokédex.
The interface uses real HTML/CSS hardware, a scrolling data terminal, a calculator,
and a Pokémon scanner. No concept-image overlay, UI framework, animation library,
or runtime dependency was added for the redesign.

## SEO and local review

See [SEO_SETUP.md](SEO_SETUP.md) for the SEO audit, changed-file inventory, local
production-preview instructions, canonical/sitemap URLs and Search Console setup.
The SEO upgrade was reviewed locally and approved for publication on 2026-09-10.

## Pokédex architecture

- `frontend/app/page.tsx` composes `PokedexShell`.
- `components/pokedex` owns casing, lenses, data feed, sprite scanner, boot sequence,
  and DATA / SHINY / FORMS / CRY controls.
- `components/calculator/CalculatorScreen.tsx` renders the form and result meters.
- `hooks/useIVCalculator.ts` owns inputs, validation, generation changes, loading,
  and results. Input edits invalidate results and any pending calculation. Request
  ownership prevents late responses from replacing a newer selection; backend
  detail/calculation requests also support cancellation.
- `hooks/usePokemonDisplayData.ts` loads optional display enrichment separately
  from calculation data. Bulbasaur is the initial preview while the picker is empty.
- `lib/pokemon-display-data.ts` normalizes PokéAPI Pokémon/species responses into
  a display model: National Dex number, genus, types, hidden abilities, height,
  weight, supported varieties, introduction generation, capture rate, experience,
  friendship, growth, egg groups, gender ratio, EV yield, English flavor text,
  sprite sources, and cry sources.
- `lib/request-cache.ts` shares in-flight/successful data requests, evicts failures,
  bounds each cache to 128 entries, and times out public fetches after 15 seconds.
- `lib/api.ts` preserves the API/static abstraction. `lib/static-api.ts` retains
  the original calculation formulas and historical-generation lookup behavior.

The search picker fetches its name list once and filters locally. It supports
arrow keys, Enter, Escape, touch selection, and retry. Generation/nature/
characteristic controls use native selects. FORMS intersects species varieties
with the existing searchable dataset, preserving its Mega/battle-only exclusions.

## Animation, sprites, and audio

The silent startup lasts about 2.85 seconds: the actual casing appears folded,
LEDs power on, wings rotate around their hinges, the camera moves closer, and
screen content lights up. Click/tap anywhere, Space, or Escape skips cleanly.
Cover widths are measured during startup so the two lids meet at a narrow seam
without stretching the lens or overlapping. The casing uses fine surface grain,
recessed exterior panels, embossed detail, and beveled hardware controls. Status
LEDs glow steadily; the blue lens alone has an occasional gentle intensity change.
The device is inert until startup finishes or is skipped. Reduced motion reaches
the open state in about 150 ms and disables the scrolling and scanner animations.

Sprite resolution uses the URLs supplied in PokéAPI's Generation V / Black-White
animated field, then the current pixel sprite, the BW still, and official artwork.
Some newer Pokémon also have animated assets in that field; no generation cutoff
is assumed. Shiny sources are tried first, followed by default sources. Image
load errors advance to the next source. Unoptimized images preserve GIF animation;
reduced motion chooses still images. Only the current sprite is loaded.

CRY plays PokéAPI's `cries.latest`, then `cries.legacy` if playback fails. Audio is
created only after a button press with `preload="none"`; changing Pokémon or
pressing again stops the previous sound. Missing cries disable the control and
playback failures expose a retry message. There is no autoplay sound.

The data feed duplicates normalized content for a CSS transform loop; the second
copy is hidden from assistive technology. Hover pauses it. Keyboard focus returns
it to a manually scrollable view; DATA resets and focuses that view. No React
animation-frame loops are used.

Desktop uses the connected three-screen device. Tablet puts the calculator above
the two secondary screens. Phones put the scanner and physical controls first,
then the calculator with stacked stat rows, followed by the data terminal.

## Quality checks

From `frontend`:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run build:pages
npm run preview:pages
```

The preview runs at `http://127.0.0.1:3102/UltimateIVCalculator-Webapp/` and serves
only `frontend/out`. It is a local validation server; the deployed app needs no
Node server. `NEXT_PUBLIC_BASE_PATH` can override the default path for both build
and preview. To run browser tests against that export, set `TEST_BASE_URL` to the
preview URL, including its trailing slash, before running `npm run test:e2e`.

Tests use Node's test runner with `tsx` for calculation/data/contract tests and
Playwright for browser interactions. ESLint/Next's ESLint config and Playwright
are development dependencies; TypeScript strict mode is enabled. The Pages
workflow runs lint, typecheck, unit tests, and browser tests before exporting.

## Validation and limits

The redesign was checked at phone widths 320–430, tablet widths, and desktop
widths through 2560. Real-data browser checks covered Bulbasaur, Pikachu,
Charizard, Ditto, Unown, Shedinja, Deoxys, Rotom, Giratina, Arceus, Darmanitan,
Kyurem, Greninja, Zygarde, Lycanroc, Necrozma, Toxtricity, Ogerpon, Terapagos,
and Suicune. Automated tests use deterministic responses for failure/retry cases.

The first-load JavaScript build estimate is about 120 kB (111 kB before redesign).
No webfont, all-Pokémon image preload, or audio preload is used. Animation uses
CSS transforms/opacity; 60 fps is a target, not a measured guarantee on all devices.

Public Pokémon metadata, images, cries, and historical records still require
network access. Optional enrichment failures do not block available calculation
data. The existing historical-source fallback and search dataset policy were
intentionally preserved; this redesign does not broaden which forms are supported.
Server-mode security headers remain configured, with a narrowly scoped media
source for PokéAPI cries. GitHub Pages cannot apply Next.js response headers.
Backend calculation implementation and existing historical-data edits were retained.
One data-correctness fix was made in both modes: Gen 1 historical records store
the shared stat under `special`. The normalizers now read it and mirror it into
both internal Special slots. Backend cached Gen 1 entries with zero Special are
refetched instead of reused. This corrects source mapping without changing formulas.
Run backend regressions from `backend` with `python -m unittest discover -s tests -v`
after installing `requirements.txt`.

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

### GitHub Pages static site
- Build the static Pages version from `frontend` with `npm run build:pages`.
- Refresh the Pages search dataset with `npm run generate:pages-data` while the backend is running.
- The `Deploy Pages` workflow publishes `frontend/out` on pushes to `main`.
- The Pages version keeps the same UI, but it loads Pokemon data from public sources in the browser instead of your FastAPI backend.

## Notes
- Gen 1 and Gen 2 use DV / Stat Exp rules.
- HP DV is derived from the other DVs in Gen 1-2.
- Gen 1 uses a single Special stat in the UI.
- Characteristics are optional and only active for Gen 4+.
- Bundled historical stats ship in `backend/app/data/historical_stats.json`.
- Runtime historical cache defaults to `backend/.runtime/historical_stats.json`.
- If a generation-specific stat record is missing from the local cache, the backend can fetch and cache it from the MIT-licensed `zhenga8533/pokedb` project.
