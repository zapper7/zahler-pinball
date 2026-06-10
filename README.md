# Zahler Pinball — Website

Single-file static site. No build step. `index.html` is the whole thing.

## Going live (one time, ~20 min)

### 1. Buy the domain (you — ~5 min)
- Go to https://dash.cloudflare.com → Domain Registration → search `zahlerpinball.com` → buy (~$10/yr).
- (Cloudflare sells at cost and hosting lives in the same dashboard — easiest path.)

### 2. Push this folder to GitHub (run `setup.sh`, or paste these)
Prereqs (once): `brew install git gh` then `gh auth login`

```bash
cd zahler-pinball-site
git init
git add .
git commit -m "Zahler Pinball v3 — launch site"
gh repo create zahler-pinball --public --source=. --push
```

### 3. Host it on Cloudflare Pages (you — ~5 min of clicking)
- Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**
- Pick the `zahler-pinball` repo
- Build settings: framework **None**, build command **(leave empty)**, output dir **/**
- Deploy. You'll get a `*.pages.dev` URL immediately.

### 4. Attach the domain (you — ~2 min)
- In the Pages project → **Custom domains → Add** → `zahlerpinball.com` (and `www`).
- Since the domain is already on Cloudflare, DNS is configured automatically. HTTPS included.

### 5. Wire the newsletter form (you + Claude — ~10 min)
- Sign up at Beehiiv or Buttondown (free tier).
- Grab your form/embed URL.
- In `index.html`, find the comment marked `WIRING NOTE` and follow it
  (or hand the URL to Claude Code: "wire the signup form to this").

### 6. The QR postcard redirect (optional, 1 min)
- Cloudflare dashboard → your domain → **Rules → Redirect Rules**
- `zahlerpinball.com/card` → `https://zahlerpinball.com/#newsletter` (302)
- Point the postcard QR codes at `/card` so you can count scans in analytics.

## Ongoing edits
Every `git push` auto-deploys in ~30 seconds.

Recommended loop: open this repo in **Claude Code** on the Mac Studio and just
describe changes ("add Pintastic dates", "swap the hero tagline"). Review the
diff, commit, push, live.

## File map
- `index.html` — the entire site (HTML + CSS + JS, no dependencies)
- `setup.sh` — one-shot script for step 2
