# SEO setup and local review

This upgrade was implemented and tested locally, then reviewed and approved by the
owner for committing and deployment on 2026-09-10. The existing Pages workflow
publishes on pushes to `main`. Search Console ownership verification and submission
remain separate owner actions described below.

## Audit of the existing application

| Area | Finding and decision |
| --- | --- |
| Framework/build | Next.js 15.5.12 App Router, React 19, TypeScript, Next build. Pages uses `output: 'export'`; no SEO server needed. |
| Routing/state | One calculator route under the project path. Generation selection is React state, not a URL. No localStorage/sessionStorage persistence. Preserve this behavior. |
| Deployment | `.github/workflows/pages.yml` deploys `frontend/out` on pushes to `main`. No workflow changes needed or made. |
| Site identity | Git remote, build script and previously verified deployment establish `https://brendonbusker.github.io/UltimateIVCalculator-Webapp/`. Project Pages site; no CNAME/custom-domain configuration found locally. |
| Previous head | “Ultimate IV Calculator” title; “Professional Pokemon IV calculator webapp” description. No canonical, social metadata, sitemap, robots file, favicon, manifest, analytics or Search Console integration. |
| Rendering | Shell/form are prerendered, then hydrated. Species information, sprites and results depend on JavaScript/APIs. New guide and metadata are rendered at build time, independent of these requests. |
| Semantics | Existing visible H1 retained. Page owns the single main landmark enclosing calculator and guide. Existing labeled controls, sprite alt text and decorative `aria-hidden` hardware preserved. |
| Mechanics | `static-data.ts` exposes Gen 1–9. Static API/backend implement Gen 1–2 DVs/Stat Exp with shared Special/derived HP, Gen 3+ IVs/EVs/natures, and Gen 4+ characteristics. No alternative game-specific stat modes. |
| Game copy | Standard games are mapped to the implemented generation rules, including Emerald/Colosseum/XD and Platinum/HGSS. Formula compatibility does not imply every species/form exists in every game. GO, Let’s Go and Legends: Arceus are excluded. Hyper Trained stats cannot reveal original IVs through this tool. |
| Performance | Existing estimate about 120 kB first-load JS. System fonts, CSS hardware, one current sprite, no eager audio, bounded caches. No new runtime dependencies, external fonts or tracking added. |

## Changed files

| File | Purpose |
| --- | --- |
| `frontend/lib/site-config.ts` (new) | Central identity, canonical URL, title, description and truthful WebApplication JSON-LD. |
| `frontend/app/layout.tsx` | Initial head metadata, canonical, Open Graph, Twitter summary, base-safe favicon and optional real Google verification token. |
| `frontend/app/sitemap.ts` (new) | Static XML containing only the canonical calculator URL; no invented dates or doorway pages. |
| `frontend/public/icon.svg` (new) | Small vector favicon based on the existing cyan circle mark in the heading. |
| `frontend/components/CalculatorGuide.tsx` (new) | Static explanation, game/generation mapping and three native disclosure tips below the device. |
| `frontend/app/page.tsx` | Guide, one main landmark, no-JavaScript notice, subtle fan-tool footer and JSON-LD. |
| `frontend/components/pokedex/PokedexShell.tsx` | Outer main becomes div so the page can own main; class and behavior preserved. |
| `frontend/app/globals.css` | Scoped guide/footer/disclosure styling and mobile wrapping; device rules unchanged. |
| `frontend/scripts/preview-pages.mjs` | Correct XML MIME type and UTF-8 HTML in local preview. |
| `frontend/tests/seo.test.ts` (new) | Canonical/sitemap integrity and truthful schema checks. |
| `frontend/tests/browser/seo.spec.ts` (new) | No-JavaScript HTML, metadata, sitemap/icon paths, responsive placement and keyboard disclosures. |
| `README.md` | Link to review and ownership-verification instructions. |
| `SEO_SETUP.md` (new) | This audit, file inventory, local review and post-approval setup. |

Pre-existing edits to `backend/app/data/historical_stats.json` and untracked redesign
notes/reference/prompt are unrelated and preserved.

## Run and review locally

From the repository root in PowerShell:

```powershell
cd frontend
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run build:pages
npm run preview:pages
```

`build:pages` only writes local `frontend/out`; it does not publish. Preview binds
only to loopback. Open these local URLs:

- Calculator: `http://127.0.0.1:3102/UltimateIVCalculator-Webapp/`
- Sitemap: `http://127.0.0.1:3102/UltimateIVCalculator-Webapp/sitemap.xml`
- Favicon: `http://127.0.0.1:3102/UltimateIVCalculator-Webapp/icon.svg`

In another terminal, from `frontend`, test the exported site:

```powershell
npx playwright install chromium
$env:TEST_BASE_URL = 'http://127.0.0.1:3102/UltimateIVCalculator-Webapp/'
npm run test:e2e
Remove-Item Env:TEST_BASE_URL
```

For live editing without a backend, set `$env:NEXT_PUBLIC_DATA_MODE = 'static'`
and run `npm run dev -- --hostname 127.0.0.1 --port 3100` from `frontend`.
Local previews intentionally retain the production canonical. Privacy comes from
loopback binding, not `noindex`; do not expose the preview via a public tunnel.
Inspect `frontend/out/index.html` to see content before hydration.

## Production URLs, after approval and deployment

- Canonical / Search Console URL-prefix property: **https://brendonbusker.github.io/UltimateIVCalculator-Webapp/**
- Sitemap to submit: **https://brendonbusker.github.io/UltimateIVCalculator-Webapp/sitemap.xml**

These are intended publication URLs, not claims that this upgrade is already live.
If hosting changes, edit `SITE.url` in `lib/site-config.ts` and match the build's
`NEXT_PUBLIC_BASE_PATH` (use `/` for an origin-root custom domain). Keep the canonical
HTTPS with a trailing slash. Rebuild and inspect all asset/SEO URLs.

### robots.txt for a project site

No project-level robots.txt is added. Google reads the origin-level file at
`https://brendonbusker.github.io/robots.txt`, which this project export cannot control.
`/UltimateIVCalculator-Webapp/robots.txt` would not replace it. An absent robots.txt
does not block normal crawling. If you control the root user-site repository,
check its rules permit this project and optionally add the sitemap URL there after
approval. No restrictive robots directive or `noindex` is added to the calculator.

### Structured data and social cards

WebApplication markup describes a free browser utility and zero-price Offer. No
ratings, reviews, author or awards are fabricated. Google requires a qualifying
rating/review for software rich-result eligibility; this implementation makes no
eligibility claim. Local checks parse JSON and inspect its properties/output; they
are not a completed Google Rich Results Test or Search Console inspection.

Open Graph and Twitter share the canonical identity and copy. No suitable existing
social artwork was present, so preview images are omitted; cards may be text summaries.
An approved branded image is optional future work. No analytics, FAQ rich-result
markup, tracking scripts or meta keywords are added.

## Search Console: owner steps after approval

1. Review the local site/diff and explicitly approve committing and deploying.
   After the approved release, confirm the canonical URL returns HTTP 200.
2. Open [Search Console](https://search.google.com/search-console). Add a **URL-prefix**
   property using the exact canonical URL above, with HTTPS and project path.
   A DNS Domain property for `github.io` is not appropriate.
3. Choose HTML tag verification. Copy the genuine token from the tag's `content`
   attribute; do not invent a value.
4. `frontend/app/layout.tsx` already accepts `GOOGLE_SITE_VERIFICATION` at build time.
   To test locally, set that environment variable to the actual token before building.
   After approval, provide the same variable to the Pages build in the workflow so
   later builds retain it. No remote settings or workflow have been changed here.
   Alternatively copy Google's exact verification HTML file into `frontend/public/`;
   it will be served under the project path. Use the exact URL Google requests.
5. After that approved release, check the tag in the generated head (or the verification
   file URL), click Verify, and retain it in future releases.
6. Submit the full sitemap URL above in Sitemaps, or `sitemap.xml` if the UI already
   supplies the property prefix.
7. Inspect the canonical URL with URL Inspection, run Test Live URL, and check the
   rendered HTML and mobile screenshot.
8. When satisfied, request indexing of the canonical page.
9. Monitor Page indexing, sitemap status and Search performance. Submission does not
   guarantee indexing, ranking or a particular snippet.

### Manual review before publishing

- Confirm unchanged device layout at desktop, tablet and phone widths. Review the
  below-device guide, three disclosures, favicon and subtle footer.
- Try a known Pokémon in Gen 1/2, Gen 3/4 and a modern generation; verify ranges,
  search, nature/characteristic controls, startup and SHINY/FORMS/CRY.
- Review the game mapping and exceptions, especially games you plan to promote.
- Inspect exported HTML for one H1/main/canonical, accurate description/JSON-LD,
  no `noindex`, and no localhost URL in SEO metadata or sitemap.
- Check local sitemap/icon URLs and mobile wrapping.

### URL Inspection checklist after the approved release

- HTTP 200, no access barrier, no `noindex`, and crawling allowed by root robots rules.
- Correct declared canonical (and Google's selected canonical when available), title,
  description and useful guide text without selecting a Pokémon.
- Correct mobile rendering and project-prefixed assets.
- Accessible/accepted sitemap with only the canonical calculator entry.
- Ownership stays verified. No Google-side verification or submission was done here.

## Optional future work

Bookmarkable generation presets are a future user-facing routing enhancement, not
part of this update. Avoid near-identical game doorway pages. Add approved social
artwork or refine copy using real Search Console data later.

## Local validation completed, 2026-09-10

- Lint, strict typecheck, 24 frontend unit tests and 3 backend tests passed.
- Both normal production build and Pages export passed. Pages first-load estimate
  remains 120 kB (normal build 121 kB), matching the previous rounded estimates.
- All 12 Playwright tests passed against the exported project-path preview: 10
  existing interaction tests plus 2 SEO/responsive tests. Coverage includes search,
  calculations/invalidation, startup, shiny/forms/cry behavior, API retries, sprite
  fallback, keyboard/touch input and widths from 320 to 2560 px.
- Additional live public-data checks on the local site found the expected perfect
  IV/DV results for Bulbasaur in Gen 9, 3, 1 and 2; shiny sprite loaded; no page errors.
- Actual `out/index.html` was parsed locally: title, description, one canonical,
  one H1/main, social tags, readable guide, valid JSON-LD, no blocking robots meta,
  and no localhost URLs in SEO metadata. XML parsing confirmed the sitemap's sole
  canonical entry. Icon and sitemap returned HTTP 200 under the project prefix.
- Before/after device bounding boxes were identical at widths 320, 390, 768, 1366
  and 1440. Desktop and phone guide screenshots were inspected. No horizontal
  overflow; guide follows the device and native disclosures work by keyboard.
- Local Lighthouse 13.4.1 mobile report: **Performance 90, Accessibility 100,
  Best Practices 100, SEO 100**. FCP 1.1 s, LCP 3.6 s, TBT 30 ms, CLS 0.
  Scores are a single local lab run, not field Core Web Vitals or a ranking guarantee.
  The preview lacks production compression/cache headers and depends on public data;
  the existing startup animation also affects when the main content appears.
  Reports completed with no Lighthouse runtime error or run warnings, but the CLI
  exited with a Windows EPERM error while cleaning its temporary Chrome directory
  afterward. This did not invalidate the saved reports.
- `git diff --check` passed before release approval. Source scope is
  **6 existing files modified and 7 new files**, separate from pre-existing changes.

Local review artifacts (ignored by Git) are in `frontend/.pages-preview/`:
`seo-lighthouse.report.html`, `seo-lighthouse.report.json`, `seo-output-audit.json`,
`seo-before-boxes.json`, `seo-after-boxes.json`, desktop/phone screenshots and
the `seo-live.cjs`/`seo-visual.cjs` validation helpers. Generated production files
are in `frontend/out/`. Review artifacts stay local and are excluded from the release;
only the generated site in `frontend/out/` is published by the Pages workflow.

## References checked

- [Google software-app structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [Schema.org WebApplication](https://schema.org/WebApplication)
- [Google robots.txt location rules](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt)
- [Search Console ownership verification](https://support.google.com/webmasters/answer/9008080)

Unpublished source/HTML was not submitted to an external validator.
