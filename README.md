# Danelfin Portfolio Dashboards

Personal investment research dashboards for **Gary A**.

Pages are **password-protected** (StatiCrypt / AES-256). Viewers enter the shared password once per page (optional “Remember for 14 days”).

## Live links (share these)

| View | URL |
|------|-----|
| Hub | https://dot2dot123.github.io/danelfin-portfolio-dashboard/ |
| OTW & OTW #2 | https://dot2dot123.github.io/danelfin-portfolio-dashboard/otw/ |
| SWB | https://dot2dot123.github.io/danelfin-portfolio-dashboard/swb/ |
| NEW & Jette | https://dot2dot123.github.io/danelfin-portfolio-dashboard/new-jette/ |

## How publishing works

1. Weekly refresh writes cleartext JSON into **`src/data/`** (gitignored — not on GitHub Pages).
2. `scripts/encrypt-pages.sh` embeds each page’s actions + meta into HTML, then encrypts with StatiCrypt.
3. Only encrypted HTML is published on `main`. Public `data/` holds a stub README only — **no plaintext recommendation JSON**.

Shared UI (no recommendations): `assets/app.js`, `assets/styles.css`.  
Cleartext HTML templates: `src/templates/`.

### Rebuild / re-encrypt (bot box)

Password file (bot box only): `/home/box/agent-data/secrets/danelfin-dashboard-password`

```bash
# After updating src/data/*.json:
./scripts/encrypt-pages.sh
git add -A && git commit -m "…" && git push origin main
```

The script reads the password from that file (or `DANELFIN_DASHBOARD_PASSWORD_FILE`). It never hardcodes the password.

## Disclaimer

Research support only — **not personalized investment advice.**
