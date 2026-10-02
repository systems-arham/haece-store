// The admin area lives at a secret path configured via ADMIN_PATH.
// This is read at request time (Node runtime), never hardcoded:
// this repo is public, so the real path must never appear in code.
function secret(): string {
  return (process.env.ADMIN_PATH || "").trim().replace(/^\/+|\/+$/g, "");
}

// Browser-visible base path for the admin UI, e.g. "/atelier-k7q2".
// Falls back to "/admin" for local dev when ADMIN_PATH is unset.
export function adminBasePath(): string {
  const s = secret();
  return s ? `/${s}` : "/admin";
}

// Browser-visible base path for admin API calls, e.g. "/api/atelier-k7q2".
export function adminApiBase(): string {
  const s = secret();
  return s ? `/api/${s}` : "/api/admin";
}
