/**
 * The "genome" of a brush stroke: a handful of numbers, all derived from one
 * integer seed, that fully describe the curve. The vertex shader turns them
 * into a ribbon; same seed → same stroke, new seed → a brand-new stroke.
 */

export const TAU = Math.PI * 2

/** One sine component of the stroke's lateral wobble. */
export interface Wave {
  /** Amplitude as a fraction of the viewport's short side. */
  amp: number
  /** Number of full cycles along the whole stroke. */
  freq: number
  phase: number
}

export interface Genome {
  seed: number
  /** Lateral wobble of the centre line (big sweep + two finer ripples). */
  waves: [Wave, Wave, Wave]
  /** Gentle "pressure" variation of the stroke width (fractions of base width). */
  pressure: [Wave, Wave]
  /** Random offsets into the noise domain so every seed has its own bristles. */
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
    waves: [
      // The big S-shaped sweep. The phase range keeps the stroke leaving the
      // screen through a corner-ish area instead of hugging an edge.
      { amp: range(0.085, 0.125), freq: range(1.45, 1.95), phase: range(-0.6, 1.2) },
      { amp: range(0.02, 0.045), freq: range(2.9, 4.0), phase: range(0, TAU) },
      { amp: range(0.005, 0.013), freq: range(6.5, 9.5), phase: range(0, TAU) },
    ],
    pressure: [
      { amp: range(0.05, 0.1), freq: range(1.2, 2.2), phase: range(0, TAU) },
      { amp: range(0.02, 0.05), freq: range(3.5, 5.5), phase: range(0, TAU) },
    ],
    noiseOffset: [range(0, 500), range(0, 500)],
  }
}

export interface PathLayout {
  /** Start / end of the base line (CSS px). Both sit outside the viewport. */
  a: [number, number]
  b: [number, number]
  /** Half of the nominal stroke width (CSS px). */
  halfWidth: number
  /** Amplitude scale for the waves (CSS px). */
  waveScale: number
}

/**
 * Where the stroke runs for a given viewport. `compact` is the portrait /
 * phone variant: thicker relative to the screen and a steeper diagonal.
 */
export function layoutPath(width: number, height: number, compact: boolean): PathLayout {
  const short = Math.min(width, height)
  if (compact) {
    return {
      a: [-0.14 * width, 1.0 * height],
      b: [1.14 * width, 0.0 * height],
      halfWidth: Math.max(18, width * 0.062),
      waveScale: width * 1.15,
    }
  }
  return {
    a: [-0.05 * width, 1.02 * height],
    b: [1.05 * width, -0.07 * height],
    halfWidth: short * 0.036, // 39px on a 1080p screen, as in the reference
    waveScale: short,
  }
}

/**
 * JS twin of `centre()` in brush.vert.glsl. Only used to measure the stroke's
 * length so the reveal animation runs at a steady speed; if the two drift
 * apart the worst case is a slightly different animation duration.
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
