# Danelfin Portfolio Dashboards

Personal investment research dashboards for **Gary Aires**.

## Live links (share these)

| View | URL |
|------|-----|
| Hub | https://dot2dot123.github.io/danelfin-portfolio-dashboard/ |
| OTW & OTW #2 | https://dot2dot123.github.io/danelfin-portfolio-dashboard/otw/ |
| SWB | https://dot2dot123.github.io/danelfin-portfolio-dashboard/swb/ |
| NEW & Jette | https://dot2dot123.github.io/danelfin-portfolio-dashboard/new-jette/ |

## Data layout (weekly refresh)

Overwrite these without rewriting HTML:

| File | Contents |
|------|----------|
| `data/otw-actions.json` | OTW + OTW #2 rows + takeaways |
| `data/swb-actions.json` | SWB only |
| `data/new-jette-actions.json` | NEW + Jette |
| `data/meta.json` | Shared as-of / portfolio index |
| `data/actions.json` | Optional full combined snapshot |

Shared UI: `assets/app.js`, `assets/styles.css`. Each page folder has only `index.html` + `window.DASHBOARD_CONFIG`.

Static HTML/CSS/JS — no login. Optional client-side Yahoo Finance quotes fail soft if blocked.

## Disclaimer

Research support only — **not personalized investment advice.**
