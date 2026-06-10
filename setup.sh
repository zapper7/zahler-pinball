#!/usr/bin/env bash
# Zahler Pinball — one-shot repo setup & push
# Prereqs: brew install git gh && gh auth login
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI not found. Run: brew install gh && gh auth login"
  exit 1
fi

if [ ! -d .git ]; then
  git init
fi

git add .
git commit -m "Zahler Pinball v3 — launch site" || echo "Nothing new to commit."

if gh repo view zahler-pinball >/dev/null 2>&1; then
  git push -u origin main 2>/dev/null || git push -u origin master
else
  gh repo create zahler-pinball --public --source=. --push
fi

echo ""
echo "✔ Repo is live on GitHub."
echo "Next: Cloudflare Pages → Connect to Git → pick 'zahler-pinball' (see README step 3)."
