// Direct-from-browser GitHub API calls. No backend — GITHUB_TOKEN (from
// config.js) is sent straight from this page to api.github.com.
//
// NOTE: photos are stored as committed files (via the Contents API), not
// as GitHub Release assets. Release asset uploads go to a different host
// (uploads.github.com) that doesn't allow direct browser requests — only
// api.github.com does. Using Contents API for everything keeps this
// working with zero backend, at the cost of each photo being a git commit
// (repo grows over time; fine for small/personal use).

const GITHUB_API = "https://api.github.com";

function ghHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function makeEventId() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function utf8ToBase64(str) {
  return arrayBufferToBase64(new TextEncoder().encode(str).buffer);
}

function base64ToUtf8(base64) {
  const binary = atob(base64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function putFile(path, base64Content, message) {
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
    {
      method: "PUT",
      headers: ghHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ message, content: base64Content }),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Creates an event (a folder at media/{id}/ with a _meta.json). Returns { id, name }.
async function createEvent(name) {
  const id = `${slugify(name)}-${makeEventId()}`;
  const meta = { name: name.trim(), createdAt: new Date().toISOString() };
  await putFile(
    `media/${id}/_meta.json`,
    utf8ToBase64(JSON.stringify(meta, null, 2)),
    `Create event: ${name.trim()}`
  );
  return { id, name: name.trim() };
}

// Looks up an existing event. Returns { name, assets }.
// assets: [{ id, name, browser_download_url }]
async function getEvent(eventId) {
  let name = eventId;
  const metaRes = await fetch(
    `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/media/${eventId}/_meta.json`,
    { headers: ghHeaders() }
  );
  if (metaRes.ok) {
    const metaFile = await metaRes.json();
    try {
      name = JSON.parse(base64ToUtf8(metaFile.content)).name || eventId;
    } catch (_) {
      /* fall back to eventId */
    }
  }

  const listRes = await fetch(
    `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/media/${eventId}`,
    { headers: ghHeaders() }
  );
  if (!listRes.ok) throw new Error("Event not found");
  const files = await listRes.json();

  const assets = files
    .filter((f) => f.name !== "_meta.json")
    .map((f) => ({ id: f.sha, name: f.name, browser_download_url: f.download_url }));

  return { name, assets };
}

// Uploads one file as a committed file under media/{eventId}/.
// Returns { name, url, error }.
async function uploadPhoto(eventId, file) {
  const safeName = `${crypto.randomUUID().slice(0, 8)}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
  try {
    const buffer = await file.arrayBuffer();
    const result = await putFile(
      `media/${eventId}/${safeName}`,
      arrayBufferToBase64(buffer),
      `Add photo: ${file.name}`
    );
    return { name: file.name, url: result.content?.download_url };
  } catch (err) {
    return { name: file.name, error: err.message };
  }
}