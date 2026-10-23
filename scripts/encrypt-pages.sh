#!/usr/bin/env bash
# Rebuild cleartext pages with embedded data, then StatiCrypt-encrypt for GitHub Pages.
# Password is read from the bot box secrets file — never hardcoded.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS_FILE="${DANELFIN_DASHBOARD_PASSWORD_FILE:-/home/box/agent-data/secrets/danelfin-dashboard-password}"
if [[ ! -f "$PASS_FILE" ]]; then
  echo "Missing password file: $PASS_FILE" >&2
  exit 1
fi
PASSWORD="$(tr -d '\r\n' < "$PASS_FILE")"
if [[ -z "$PASSWORD" ]]; then
  echo "Password file is empty: $PASS_FILE" >&2
  exit 1
fi

if [[ ! -d src/data ]] || [[ ! -f src/data/meta.json ]]; then
  echo "Missing src/data build inputs. Weekly refresh must write JSON there first." >&2
  exit 1
fi

echo "Building cleartext pages with embedded data…"
node scripts/build-embed.mjs

if [[ ! -f .staticrypt.json ]]; then
  echo "Generating StatiCrypt salt config…"
  SALT="$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")"
  printf '{\n  "options": {\n    "salt": "%s"\n  }\n}\n' "$SALT" > .staticrypt.json
fi

export STATICRYPT_PASSWORD="$PASSWORD"

encrypt_one() {
  local clear_html="$1"
  local dest_html="$2"
  local tmp
  tmp="$(mktemp -d)"
  npx --yes staticrypt "$clear_html" \
    -d "$tmp" \
    -c .staticrypt.json \
    --remember 14 \
    --short \
    --template-title "Gary A · Danelfin dashboards" \
    --template-instructions "Enter the shared password to view this research dashboard." \
    --template-button "Unlock" \
    --template-placeholder "Password" \
    --template-remember "Remember for 14 days" \
    --template-color-primary "#3b82f6" \
    --template-color-secondary "#0f172a"
  local produced
  produced="$(find "$tmp" -type f -name '*.html' | head -1)"
  if [[ -z "$produced" || ! -f "$produced" ]]; then
    echo "Encrypted output missing for $clear_html" >&2
    find "$tmp" -type f >&2 || true
    rm -rf "$tmp"
    exit 1
  fi
  mkdir -p "$(dirname "$dest_html")"
  cp "$produced" "$dest_html"
  rm -rf "$tmp"
  echo "published $dest_html"
}

echo "Encrypting pages…"
encrypt_one "build/clear/index.html" "$ROOT/index.html"
encrypt_one "build/clear/otw/index.html" "$ROOT/otw/index.html"
encrypt_one "build/clear/swb/index.html" "$ROOT/swb/index.html"
encrypt_one "build/clear/new-jette/index.html" "$ROOT/new-jette/index.html"

mkdir -p "$ROOT/data"
cat > "$ROOT/data/README.md" << 'STUB'
# Data

Recommendation JSON is **not** published as plaintext.

Weekly refresh embeds actions + meta into each page’s HTML, then encrypts the HTML with StatiCrypt.
After you unlock a page with the shared password, the dashboard reads embedded data in-browser.

Public stubs only — no ticker recommendations here.
STUB
rm -f "$ROOT/data/"*-actions.json "$ROOT/data/actions.json" "$ROOT/data/meta.json" 2>/dev/null || true

unset STATICRYPT_PASSWORD
echo "Done. Cleartext build left in build/clear/ (gitignored)."
