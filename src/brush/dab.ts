/**
 * The brush tip.
 *
 * The background stroke is made the way a Photoshop "chalk" brush makes one:
 * a single sparse, speckled disc — the *dab* — stamped over and over along the
 * path with a random sideways scatter. Alone a dab is mostly holes; overlapped,
 * the middle fills in solid while the rim keeps its ragged, clumpy speckle.
 *
 * `generateDab` bakes that disc into a small texture. The numbers (see
 * BRUSH in genome.ts) were fitted to the reference artwork: dabs of radius
 * 36px, peaking at 45% density, stamped every 1.5px and scattered ±50px sideways
 * reproduce the reference stroke's measured cross-section — a solid core about
 * 87px wide that fades out over the next ~40px — and its fine grain.
 */

/** Texture size in texels. */
export const DAB_SIZE = 128

/** Radial density of the dab: peak · (1 − r^falloff)^shape, with r in 0..1. */
export const DAB_PEAK = 0.45
export const DAB_FALLOFF = 1.5
export const DAB_SHAPE = 1

function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  let fx = x - ix
  let fy = y - iy
  fx = fx * fx * (3 - 2 * fx)
  fy = fy * fy * (3 - 2 * fy)
  const a = hash2(ix, iy, seed)
  const b = hash2(ix + 1, iy, seed)
  const c = hash2(ix, iy + 1, seed)
  const d = hash2(ix + 1, iy + 1, seed)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

function fbm(x: number, y: number, seed: number, octaves: number): number {
  let sum = 0
  let amp = 0.5
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x, y, seed + i * 101)
    norm += amp
    x = x * 2.03 + 17.1
    y = y * 2.03 + 9.7
    amp *= 0.5
  }
  return sum / norm
}

/**
 * Returns a DAB_SIZE² single-channel image. A texel is paint where its value
 * is ≥ 128. Values vary smoothly across a chip's edge, so sampling the texture
 * with linear filtering and thresholding gives a clean outline at any scale.
 */
export function generateDab(seed: number): Uint8Array {
  const n = DAB_SIZE
  const raw = new Float32Array(n * n)
  const radius = new Float32Array(n * n)
  // Equal-area rings (ring index grows with r²), each ranked on its own below.
  const RINGS = 24
  const ringOf = new Uint8Array(n * n)
  const ringValues: number[][] = Array.from({ length: RINGS }, () => [])

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) / n) * 2 - 1
      const y = ((j + 0.5) / n) * 2 - 1
      const r = Math.hypot(x, y)
      const k = j * n + i
      radius[k] = r
      if (r >= 1) continue

      // Domain-warped, multi-scale noise: swirly clumps with ragged outlines.
      const wx = x + 0.16 * (valueNoise(x * 3.1 + 4, y * 3.1 + 1, seed + 7) - 0.5)
      const wy = y + 0.16 * (valueNoise(x * 3.1 + 9, y * 3.1 + 5, seed + 13) - 0.5)
      // (Nothing finer than ~2 texels: linear filtering would erase it, and
      // paint would silently vanish from the rim.)
      raw[k] = 0.65 * fbm(wx * 6, wy * 6, seed, 3) + 0.35 * fbm(wx * 15, wy * 15, seed + 31, 2)
      const ring = Math.min(RINGS - 1, Math.floor(r * r * RINGS))
      ringOf[k] = ring
      ringValues[ring].push(raw[k])
    }
  }

  // Replace each value by its rank (0..1) *within its ring*. "rank > 1 − p"
  // then selects exactly a fraction p of the ring however the noise happens to
  // be distributed, and clumps stay intact. A single global ranking would let
  // one big clump decide the density of the small central region.
  const sorted = ringValues.map((values) => Float32Array.from(values).sort())
  const rank = (ring: number, v: number): number => {
    const list = sorted[ring]
    let lo = 0
    let hi = list.length
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (list[mid] < v) lo = mid + 1
      else hi = mid
    }
    return lo / list.length
  }

  const out = new Uint8Array(n * n)
  for (let k = 0; k < n * n; k++) {
    const r = radius[k]
    if (r >= 1) continue // stays 0 = no paint
    const density = DAB_PEAK * Math.pow(1 - Math.pow(r, DAB_FALLOFF), DAB_SHAPE)
    const margin = rank(ringOf[k], raw[k]) - (1 - density) - 0.002
    out[k] = Math.max(0, Math.min(255, Math.round(128 + margin * 600)))
  }
  return out
}
