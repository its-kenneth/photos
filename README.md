# GitHub-backed media storage — no-backend MVP

Every event is a GitHub Release; every photo is a release asset. Both pages
call the GitHub REST API **directly from the browser** — there's no server,
no worker, nothing to deploy or host beyond the two static pages themselves.

## How it works

- `docs/config.template.js` — a template with `__GITHUB_TOKEN__` as a
  placeholder, plus your username and repo name. Safe to commit.
- `.github/workflows/deploy.yml` — on every push to `main`, substitutes the
  real token (from a GitHub Actions secret) into the template, producing
  `docs/config.js`, and publishes straight to Pages. **The real token is
  never written to any git commit** — it only ever exists inside the
  deployment artifact.
- `docs/github.js` — shared functions (`createEvent`, `getEvent`,
  `uploadPhoto`, `listEvents`, `deleteEvent`, `zipAndDownloadAssets`,
  `copyToClipboard`) that call `api.github.com` straight from the page.
- `docs/index.html` — create an event (optionally with a custom link name
  instead of a random one), optionally upload the first batch of photos,
  get back a shareable link.
- `docs/event.html` — the gallery for one event. Anyone with the link can
  view, select, and download; a share button copies the link; the page
  can also upload more photos.
- `docs/events.html` — every event as a row: name/link, share, download
  all (zipped), and delete (removes the event and all its photos).

## ⚠️ Read this before you use it

The final, deployed `config.js` still contains a real GitHub token in
client-side JavaScript — that part hasn't changed, and anyone who views the
deployed page's source can see and reuse it. What's fixed is that the token
never gets **committed to git**, so GitHub's secret-scanning push protection
won't detect and auto-revoke it the moment you push.

To keep the exposure small:

- Use a **fine-grained personal access token**, scoped to **only** the one
  repo you're using for storage — nothing else in your account.
- Give it only **Contents: read and write**. No other permissions.
- Don't reuse this token anywhere else, and don't put anything valuable in
  the storage repo besides event photos.
- If it ever gets abused, revoke it in GitHub settings, generate a new one,
  update the Actions secret, and push again to redeploy.

This setup is fine for something you're sharing with friends/family. It is
not something to put in front of the general public.

## Setup

1. **Create the storage repo.** A public GitHub repo, empty is fine — it
   will hold nothing but releases.
2. **Create the token.** Settings → Developer settings → Personal access
   tokens → Fine-grained tokens → generate one scoped to that repo, with
   Contents: read and write.
3. **Edit `docs/config.template.js`** — fill in your username and repo name
   (leave `__GITHUB_TOKEN__` as-is, do not put a real token in this file).
4. **Add the token as a repo secret.** Settings → Secrets and variables →
   Actions → New repository secret. Name it `GH_MEDIA_TOKEN`, paste the
   token as the value.
5. **Set Pages to deploy via Actions.** Settings → Pages → Source →
   "GitHub Actions" (not a branch).
6. **Push to `main`.** The workflow builds `config.js` from the template,
   substitutes the secret, and deploys — nothing to do manually after that.
   Every future push redeploys automatically.

## Storage model

Each event is a folder at `media/{eventId}/` in the repo: a `_meta.json`
with the event name, plus one committed file per photo. Photos are stored
via the **Contents API**, not GitHub Release assets — release *asset
uploads* go through a different host (`uploads.github.com`) that doesn't
allow direct requests from browser JavaScript (no CORS), unlike
`api.github.com`, which everything else here uses. If you ever add a real
backend (e.g. a small serverless function) instead of calling the API
straight from the browser, that CORS restriction stops mattering — a
server isn't subject to it — and Release assets become viable again, which
avoids the repo-bloat tradeoff below.

## Notes / known limits

- Custom event links reuse the existing `event.html?id=...` page — they set
  the `id` to whatever you typed (slugified) instead of a random string.
  They're not clean paths without a query string (e.g. not
  `yoursite/event-name` with no `?id=`) — that would need a separate
  generated HTML file per event, which this MVP doesn't do.
- The storage repo must stay **public** so `event.html` can read files
  without needing the token for viewing. An event's photos are only as
  private as its link is secret.
- Every photo upload is a git commit, so the repo grows and its history
  never shrinks (even if a photo is later deleted). Fine for personal-scale
  use; not something to run at real scale.
- No thumbnailing — galleries load full-resolution images. Worth adding
  client-side resizing before upload if albums get big.
- Reads and writes are still subject to GitHub's API rate limits (higher
  when using a token, as this setup does, but still finite).
- Multi-photo download zips client-side via JSZip — no server cost, but
  slow for very large batches since every file is fetched first.