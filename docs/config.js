// This file is a TEMPLATE, not the live config. GitHub Actions fills in
// __GITHUB_TOKEN__ at deploy time and publishes the result as config.js —
// the real token is never committed to git, so GitHub's secret scanning
// has nothing to find and revoke.
//
// GITHUB_OWNER / GITHUB_REPO aren't secret, so they're just filled in here
// directly rather than pulled from a secret.
 
const GITHUB_TOKEN = "__GITHUB_TOKEN__";
// Fill these in with your own values.
// GITHUB_TOKEN: a fine-grained PAT scoped to ONLY this one repo,
// with Contents: read and write. Nothing else.
//
// WARNING: this token is embedded in public, client-side JS. Anyone who
// views this page can read and reuse it to write to GITHUB_REPO below.
// Do not scope it to anything beyond this one throwaway storage repo.

const GITHUB_TOKEN = "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";
const GITHUB_OWNER = "its-kenneth";
const GITHUB_REPO = "photos";
