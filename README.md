# PawPlate

Personal radiology reporting workspace (hosted).

- App: https://pawarintt.github.io/pawplate/#/report-writer/templates
- Frontend source: `docs/` (deployed via GitHub Pages)
- Backend: PocketBase at the URL in `docs/config.js`
- Backend hooks: `pb_hooks/`

## Layout

- `docs/app/` — frontend modules (`main.js`, `state.js`, `dom.js`, `constants.js`, `utils.js`)
- `docs/app.js`, `docs/app-20260706.js` — compatibility loaders for old cached URLs (keep)
- `docs/index.html` — module entry is `app/main.js` with a cache-busting `?v=` param
- `scripts/ensure-*.mjs` — backend maintenance scripts (tracked)
- `tools/verify-frontend.ps1` / `.cmd` — frontend checks
- `seed/`, `pb_data/`, `Report/`, `*.xlsx` — local-only data, intentionally untracked (see `.gitignore`)

## Verify

Run `tools\verify-frontend.cmd` before pushing frontend changes.
It checks JS syntax, DOM id bindings, duplicate ids, compatibility loaders, and the cache version.
