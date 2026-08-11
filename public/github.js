// Direct-from-browser GitHub API calls. No backend — GITHUB_TOKEN (from
// config.js) is sent straight from this page to api.github.com.

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

// Creates a release (an "event"). Returns { id, name, uploadUrlBase }.
async function createEvent(name) {
  const tag = `${slugify(name)}-${makeEventId()}`;

  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
    {
      method: "POST",
      headers: ghHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        tag_name: tag,
        name: name.trim(),
        body: `Event created ${new Date().toISOString()}`,
        draft: false,
        prerelease: false,
      }),
    }
  );

  if (!res.ok) throw new Error(await res.text());
  const release = await res.json();
  return {
    id: tag,
    name: name.trim(),
    uploadUrlBase: release.upload_url.replace("{?name,label}", ""),
  };
}

// Looks up an existing event by tag. Returns { name, assets, uploadUrlBase }.
async function getEvent(tag) {
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/${tag}`,
    { headers: ghHeaders() }
  );
  if (!res.ok) throw new Error("Event not found");
  const release = await res.json();
  return {
    name: release.name || tag,
    assets: release.assets || [],
    uploadUrlBase: release.upload_url.replace("{?name,label}", ""),
  };
}

// Uploads one file as a release asset. Returns { name, url, size } or { name, error }.
async function uploadPhoto(uploadUrlBase, file) {
  const safeName = `${crypto.randomUUID().slice(0, 8)}-${file.name.replace(/[^\w.\-]+/g, "_")}`;

  const res = await fetch(`${uploadUrlBase}?name=${encodeURIComponent(safeName)}`, {
    method: "POST",
    headers: ghHeaders({ "Content-Type": file.type || "application/octet-stream" }),
    body: await file.arrayBuffer(),
  });

  if (!res.ok) return { name: file.name, error: await res.text() };
  const asset = await res.json();
  return { name: file.name, url: asset.browser_download_url, size: asset.size };
}
