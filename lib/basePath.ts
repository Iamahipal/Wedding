/**
 * Trap 24. On a GitHub *project* page the site lives at /<repo>/, not at the root.
 * Next rewrites its own URLs, but any path we hand to fetch() or to an <img src>
 * ourselves is untouched — it resolves against the domain root and 404s in
 * production while working perfectly on localhost.
 *
 * Every reference to anything in public/ goes through asset().
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function asset(path: string): string {
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`
}
