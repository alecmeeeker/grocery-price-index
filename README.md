# The Bushwick Grocery Price Index — intern project site

Static site (GitHub Pages) for the Summer 2026 intern assignment: pitch, plan,
report, and publish a data-journalism grocery price index for Bushwick Daily.

## What's here

| Path | What it is | Audience |
|---|---|---|
| `index.html` | The playbook — mission, roles, the nine phases | **Interns** |
| `phases/phase-1…9-*.html` | Fill-in worksheets, one per phase (autosave + submit) | **Interns** |
| `coordinator.html` | Coaching guide — the rigor bar, principles, context to steer with | **Coordinator only — not linked from intern pages** |
| `assets/css/bd.css` | Brand stylesheet (Bushwick Daily colors + type) | — |
| `assets/js/worksheet.js` | Worksheet engine: autosave, download, submit-to-Drive | — |
| `assets/js/config.js` | Two URLs you paste in when the Drive side is ready | — |
| `apps-script/` | The Google Apps Script backend + deploy guide | — |

`coordinator.html` is intentionally **not linked** from any intern-facing page
and is marked `noindex`. Share its URL only with the Coordinator. (It is not a
security boundary — anyone with the URL can open it — but it stays out of the
interns' normal path.)

## Publish on GitHub Pages

1. Create a repo and push this folder to it (see below).
2. Repo **Settings → Pages** → *Build and deployment* → **Deploy from a branch**
   → Branch **main**, folder **/ (root)** → **Save**.
3. The site publishes at `https://<user>.github.io/<repo>/`.
   - Playbook: `…/index.html`
   - Coordinator guide: `…/coordinator.html`

`.nojekyll` is included so GitHub serves the files as-is.

## Turn on Drive submission (optional, do it anytime)

The worksheets work immediately without a backend: they autosave to the browser
and can **Download a Word copy** to upload to Drive by hand. To enable one-click
**Submit to Drive**, follow `apps-script/README.md`, then paste two URLs into
`assets/js/config.js` and push. Nothing else changes.

## Source material

The original Word/Excel drafts this site replaces are kept in the repo root
(`00_Project_Brief_and_Playbook.docx`, the `Phase*_TEMPLATE.docx` files, and
`Grocery_Price_Index_Tracker.xlsx`) for reference. The spreadsheet
(Progress Tracker / Basket / Store List / Price Data / Analysis / Coverage
Matrix) is still the live data spine — the Phase 3 and Phase 4 worksheets link
out to it.

## First push (from this folder)

```bash
git init
git add .
git commit -m "Grocery Price Index intern site"
git branch -M main
git remote add origin git@github.com:<user>/<repo>.git
git push -u origin main
```
