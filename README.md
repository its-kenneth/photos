# GitHub-backed media storage — no-backend MVP

Every event is a GitHub Release; every photo is a release asset. Both pages
call the GitHub REST API **directly from the browser** — there's no server,
no worker, nothing to deploy or host beyond the two static pages themselves.

## How it works

- `public/config.js` — your GitHub token, username, and repo name. The only
  file you edit.
- `public/github.js` — shared functions (`createEvent`, `getEvent`,
  `uploadPhoto`) that call `api.github.com` straight from the page.
- `public/index.html` — create an event, optionally upload the first batch
  of photos, get back a shareable link.
- `public/event.html` — the gallery for one event. Anyone with the link can
  view and download; the page can also upload more photos if it has the token.

## ⚠️ Read this before you use it

`config.js` embeds a real GitHub token in public, client-side JavaScript.
**Anyone who opens your page and views source can see and reuse that token.**

To keep the exposure small:

- Use a **fine-grained personal access token**, scoped to **only** the one
  repo you're using for storage — nothing else in your account.
- Give it only **Contents: read and write**. No other permissions.
- Don't reuse this token anywhere else, and don't put anything valuable in
  the storage repo besides event photos.
- If it ever gets abused, revoke it in GitHub settings and issue a new one —
  that's the only "kill switch" you have.

This setup is fine for something you're sharing with friends/family. It is
not something to put in front of the general public.

## Setup

1. **Create the storage repo.** A public GitHub repo, empty is fine — it
   will hold nothing but releases.
2. **Create the token.** Settings → Developer settings → Personal access
   tokens → Fine-grained tokens → generate one scoped to that repo, with
   Contents: read and write.
3. **Edit `public/config.js`** — paste in the token, your username, and the
   repo name.
4. **Host the `public/` folder.** Push it to a repo and turn on GitHub Pages.
   That's the whole app — open `index.html` there.

## Notes / known limits

- The storage repo must stay **public** so `event.html` can read releases
  without needing the token for viewing. An event's photos are only as
  private as its link is secret.
- No thumbnailing — galleries load full-resolution images. Worth adding
  client-side resizing before upload if albums get big.
- Reads and writes are still subject to GitHub's API rate limits (higher
  when using a token, as this setup does, but still finite).
- Multi-photo download zips client-side via JSZip — no server cost, but
  slow for very large batches since every file is fetched first.
