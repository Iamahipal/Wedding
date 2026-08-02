/**
 * Static film. No server, no runtime. `output: 'export'` writes a folder of files.
 *
 * BASE_PATH exists for GitHub *project* pages, which serve from /<repo>/ rather
 * than from the domain root. Next rewrites the URLs it generates itself, but not
 * the ones we build by hand — see lib/basePath.ts, and route every public/ fetch
 * through it. Getting this wrong works locally and 404s only in production.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // there is an unrelated lockfile in the parent directory; pin the root so
  // Turbopack never infers its way out of this project
  turbopack: { root: projectRoot },
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
}

export default nextConfig
