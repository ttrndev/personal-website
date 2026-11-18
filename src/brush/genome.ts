/**
 * The "genome" of a brush stroke: a handful of numbers, all derived from one
 * integer seed, that fully describe the curve. The vertex shader stamps dabs
 * along it; same seed → same stroke, new seed → a brand-new stroke.
 */

export const TAU = Math.PI * 2

/**
 * The brush, in pixels of the 1920×1080 reference artwork (everything is
 * multiplied by `PathLayout.scale` for other screens). Fitted to the measured
 * cross-section of the reference stroke — see dab.ts.
 */
export const BRUSH = {
  /** Radius of one dab. */
  radius: 36,
  /** Distance between two stamps along the path. */
  spacing: 1.5,
  /** Each stamp lands up to this far to either side of the path. */
  scatter: 50,
  /** Random size variation of a dab (± fraction of its radius). */
  sizeJitter: 0.15,
} as const

/** Never fewer / more stamps than this, whatever the screen size. */
const MIN_DABS = 300
const MAX_DABS = 3200

/** One sine component of the stroke's lateral wobble. */
export interface Wave {
  /** Amplitude as a fraction of `PathLayout.waveScale`. */
  amp: number
  /** Number of full cycles along the whole stroke. */
  freq: number
  phase: number
}

export interface Genome {
  seed: number
  /** Lateral wobble of the centre line: one big sweep plus a slow, gentle undulation. */
  waves: [Wave, Wave]
  /** Gentle "pressure" variation of the stroke width (fractions of base width). */
  pressure: [Wave, Wave]
  /** Random offsets into the shader's hash domain so every seed has its own dab placement. */
  noiseOffset: [number, number]
}

/** Small, fast, good-enough seeded PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createGenome(seed: number): Genome {
  const rnd = mulberry32(seed)
  const range = (min: number, max: number) => min + (max - min) * rnd()

  return {
    seed,
    // Kept deliberately calm: a stroke is smooth when its second wave is slow
    // and small next to the main sweep (slope ≈ amplitude × frequency), and
    // there is no third, finer ripple at all.
    waves: [
      // The big S-shaped sweep. The phase range keeps the stroke leaving the
      // screen through a corner-ish area instead of hugging an edge.
      { amp: range(0.085, 0.125), freq: range(1.4, 1.9), phase: range(-0.6, 1.2) },
      { amp: range(0.012, 0.028), freq: range(2.3, 3.1), phase: range(0, TAU) },
    ],
    pressure: [
      { amp: range(0.03, 0.06), freq: range(1.0, 1.7), phase: range(0, TAU) },
      { amp: range(0.01, 0.02), freq: range(2.2, 3.0), phase: range(0, TAU) },
    ],
    noiseOffset: [range(0, 500), range(0, 500)],
  }
}

export interface PathLayout {
  /** Start / end of the base line (CSS px). Both sit outside the viewport. */
  a: [number, number]
  b: [number, number]
  /** Size of everything relative to the 1920×1080 reference (1 = same size). */
  scale: number
  /** Amplitude scale for the waves (CSS px). */
  waveScale: number
}

/**
 * Where the stroke runs for a given viewport. `compact` is the portrait /
 * phone variant: a steeper diagonal and a stroke sized to the screen's width.
 */
export function layoutPath(width: number, height: number, compact: boolean): PathLayout {
  if (compact) {
    return {
      a: [-0.14 * width, 1.0 * height],
      b: [1.14 * width, 0.0 * height],
      // Reference stroke ≈ 11.6% of the height; on a tall phone that would
      // swallow the screen, so take ~19% of the width instead (never bigger than the reference).
      scale: Math.min(1, width / 658),
      waveScale: width * 1.5,
    }
  }
  const short = Math.min(width, height)
  return {
    a: [-0.05 * width, 1.02 * height],
    b: [1.05 * width, -0.07 * height],
    scale: short / 1080,
    waveScale: short,
  }
}

/**
 * JS twin of `centre()` in brush.vert.glsl. Only used to measure the stroke's
 * length (to decide how many dabs to stamp); if the two drift apart the worst
 * case is a slightly different dab spacing.
 */
export function measurePathLength(genome: Genome, layout: PathLayout, steps = 400): number {
  const [ax, ay] = layout.a
  const [bx, by] = layout.b
  const dx = bx - ax
  const dy = by - ay
  const chord = Math.hypot(dx, dy)
  const nx = -dy / chord
  const ny = dx / chord

  let length = 0
  let px = ax
  let py = ay
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    let off = 0
    for (const w of genome.waves) off += w.amp * layout.waveScale * Math.sin(TAU * w.freq * t + w.phase)
    const x = ax + dx * t + nx * off
    const y = ay + dy * t + ny * off
    length += Math.hypot(x - px, y - py)
    px = x
    py = y
  }
  return length
}

/** How many dabs to stamp so they sit `BRUSH.spacing` (scaled) apart. */
export function dabCountFor(length: number, scale: number): number {
  const count = Math.round(length / (BRUSH.spacing * scale))
  return Math.min(MAX_DABS, Math.max(MIN_DABS, count))
}
