// Serves the production build (dist/) the way a real web server would: brotli /
// gzip compression and long-lived caching for the hashed files in /assets.
//
//   npm run serve                  → http://0.0.0.0:5173
//   PORT=8080 HOST=127.0.0.1 npm run serve
//
// No dependencies; meant for trying the build out, not for production traffic.
import { createServer } from 'node:http'
import { readdir, readFile } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const root = resolve('dist')
const port = Number(process.env.PORT ?? 5173)
const host = process.env.HOST ?? '0.0.0.0'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
}
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.ttf', '.json'])

// Everything is small, so read and compress it all once at start-up.
const files = new Map() // url path → { type, cache, variants: { br, gzip, identity } }
for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue
  const full = join(entry.parentPath, entry.name)
  const urlPath = '/' + full.slice(root.length + 1).split(sep).join('/')
  const ext = extname(full)
  const body = await readFile(full)
  const variants = { identity: body }
  if (COMPRESSIBLE.has(ext)) {
    variants.gzip = gzipSync(body, { level: 9 })
    variants.br = brotliCompressSync(body, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: body.length },
    })
  }
  files.set(urlPath, {
    type: TYPES[ext] ?? 'application/octet-stream',
    // Hashed build output never changes; everything else must be re-checked.
    cache: urlPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    variants,
  })
}

createServer((req, res) => {
  let pathname
  try {
    pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
  } catch {
    res.writeHead(400).end('Bad request')
    return
  }
  if (pathname.endsWith('/')) pathname += 'index.html'

  const file = files.get(pathname) // an exact lookup, so there is no path traversal to guard against
  if (!file || (req.method !== 'GET' && req.method !== 'HEAD')) {
    res.writeHead(file ? 405 : 404, { 'Content-Type': 'text/plain; charset=utf-8' }).end(file ? 'Method not allowed' : 'Not found')
    return
  }

  const accepted = String(req.headers['accept-encoding'] ?? '')
  const encoding = file.variants.br && /\bbr\b/.test(accepted) ? 'br' : file.variants.gzip && /\bgzip\b/.test(accepted) ? 'gzip' : 'identity'
  const body = file.variants[encoding]

  res.writeHead(200, {
    'Content-Type': file.type,
    'Content-Length': body.length,
    'Cache-Control': file.cache,
    Vary: 'Accept-Encoding',
    ...(encoding === 'identity' ? {} : { 'Content-Encoding': encoding }),
  })
  res.end(req.method === 'HEAD' ? undefined : body)
}).listen(port, host, () => {
  const kb = (n) => (n / 1024).toFixed(0) + ' KB'
  console.log(`Serving dist/ on http://${host}:${port}  (${files.size} files, brotli/gzip)`)
  for (const [path, f] of files) {
    const v = f.variants
    console.log(`  ${path.padEnd(44)} ${kb(v.identity.length).padStart(7)}${v.br ? `  → br ${kb(v.br.length)}` : ''}`)
  }
})
