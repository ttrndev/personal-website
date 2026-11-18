import vertexSource from './brush.vert.glsl?raw'
import fragmentSource from './brush.frag.glsl?raw'
import { layoutPath, measurePathLength, type Genome, type PathLayout } from './genome'

/** Ribbon resolution. Smooth even for the long, sweeping curves. */
const SEGMENTS = 640
/** Stroke colour, sampled from the reference artwork (#49423a). */
const INK: [number, number, number] = [73 / 255, 66 / 255, 58 / 255]
/**
 * The brush tip is ragged and bristles run ahead of it, so the brush has to
 * travel this far past the end of the stroke before every pixel is painted.
 */
const TIP_PAD = 380

export interface BrushOptions {
  genome: Genome
  /** Length of the draw-on animation in ms. */
  duration?: number
  /** Skip the animation and paint the finished stroke straight away. */
  reducedMotion?: boolean
}

function easeInOutCubic(k: number): number {
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
}

/**
 * Draws one procedurally generated brush stroke with WebGL2.
 *
 * The animation only runs while the stroke is being drawn; once it finishes
 * (or on resize) a single frame is rendered and the GPU goes back to sleep.
 */
export class BrushRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly genome: Genome
  private readonly duration: number
  private readonly reducedMotion: boolean

  private gl!: WebGL2RenderingContext
  private program: WebGLProgram | null = null
  private vao: WebGLVertexArrayObject | null = null
  private uniforms: Record<string, WebGLUniformLocation | null> = {}

  private cssWidth = 0
  private cssHeight = 0
  private pixelRatio = 1
  private compact = false
  private layout: PathLayout | null = null
  private length = 0

  /** -1 = nothing painted yet, 0 → 1 = brush travelling, 1 = finished. */
  private progress = -1
  private startAt = 0
  private raf = 0
  private contextLost = false

  constructor(canvas: HTMLCanvasElement, options: BrushOptions) {
    this.canvas = canvas
    this.genome = options.genome
    this.duration = options.duration ?? 3000
    this.reducedMotion = options.reducedMotion ?? false

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    })
    if (!gl) throw new Error('WebGL2 is not available')
    this.gl = gl

    this.init()
    canvas.addEventListener('webglcontextlost', this.onContextLost)
    canvas.addEventListener('webglcontextrestored', this.onContextRestored)
  }

  /** Switch between the landscape and the portrait/phone geometry. */
  setCompact(compact: boolean): void {
    if (compact === this.compact) return
    this.compact = compact
    this.updateLayout()
    this.draw()
  }

  /** Match the drawing buffer to the canvas' size on screen. */
  resize(cssWidth: number, cssHeight: number, pixelRatio: number): void {
    this.cssWidth = cssWidth
    this.cssHeight = cssHeight
    this.pixelRatio = pixelRatio
    this.canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio))
    this.canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio))
    this.updateLayout()
    this.draw() // resizing clears the canvas, so repaint immediately
  }

  /** Start the draw-on animation. */
  play(delayMs = 0): void {
    if (this.reducedMotion) {
      this.progress = 1
      this.draw()
      return
    }
    cancelAnimationFrame(this.raf)
    this.startAt = performance.now() + delayMs
    this.raf = requestAnimationFrame(this.tick)
  }

  dispose(): void {
    cancelAnimationFrame(this.raf)
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored)
    if (!this.contextLost) {
      const { gl } = this
      if (this.program) gl.deleteProgram(this.program)
      if (this.vao) gl.deleteVertexArray(this.vao)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }

  // ---------------------------------------------------------------------------

  private readonly tick = (now: number): void => {
    const k = Math.min(1, Math.max(0, (now - this.startAt) / this.duration))
    this.progress = easeInOutCubic(k)
    this.draw()
    this.raf = k < 1 ? requestAnimationFrame(this.tick) : 0
  }

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault() // required, otherwise the context is never restored
    this.contextLost = true
    cancelAnimationFrame(this.raf)
  }

  private readonly onContextRestored = (): void => {
    this.contextLost = false
    this.init()
    this.draw()
    if (this.progress >= 0 && this.progress < 1) this.raf = requestAnimationFrame(this.tick)
  }

  private updateLayout(): void {
    if (this.cssWidth === 0 || this.cssHeight === 0) return
    this.layout = layoutPath(this.cssWidth, this.cssHeight, this.compact)
    this.length = measurePathLength(this.genome, this.layout)
  }

  private init(): void {
    const { gl } = this
    const program = gl.createProgram()
    if (!program) throw new Error('Could not create a WebGL program')

    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertexSource],
      [gl.FRAGMENT_SHADER, fragmentSource],
    ] as const) {
      const shader = gl.createShader(type)
      if (!shader) throw new Error('Could not create a shader')
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader)
        gl.deleteShader(shader)
        throw new Error(`Brush shader failed to compile:\n${log}`)
      }
      gl.attachShader(program, shader)
      gl.deleteShader(shader) // freed automatically once the program is deleted
    }

    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Brush program failed to link:\n${gl.getProgramInfoLog(program)}`)
    }

    this.program = program
    this.uniforms = {}
    for (const name of [
      'uView', 'uA', 'uB', 'uWave', 'uPress', 'uHalfW', 'uSegments',
      'uInk', 'uSeed', 'uLen', 'uHead', 'uGrain',
    ]) {
      this.uniforms[name] = gl.getUniformLocation(program, name)
    }

    // The geometry is generated from gl_VertexID, so there are no buffers, but
    // WebGL2 still wants a (blank) vertex array object bound.
    this.vao = gl.createVertexArray()
  }

  private draw(): void {
    const { gl, layout, uniforms: u } = this
    if (!layout || !this.program || this.contextLost) return

    const { genome } = this
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(this.program)
    gl.bindVertexArray(this.vao)

    gl.uniform2f(u.uView, this.cssWidth, this.cssHeight)
    gl.uniform2f(u.uA, layout.a[0], layout.a[1])
    gl.uniform2f(u.uB, layout.b[0], layout.b[1])
    gl.uniform3fv(u.uWave, genome.waves.flatMap((w) => [w.amp * layout.waveScale, w.freq, w.phase]))
    gl.uniform3fv(u.uPress, genome.pressure.flatMap((w) => [w.amp, w.freq, w.phase]))
    gl.uniform1f(u.uHalfW, layout.halfWidth)
    gl.uniform1f(u.uSegments, SEGMENTS)

    gl.uniform3f(u.uInk, INK[0], INK[1], INK[2])
    gl.uniform2f(u.uSeed, genome.noiseOffset[0], genome.noiseOffset[1])
    gl.uniform1f(u.uLen, this.length)
    gl.uniform1f(u.uHead, this.progress * (this.length + TIP_PAD))
    gl.uniform1f(u.uGrain, Math.max(1, Math.floor(this.pixelRatio)))

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, (SEGMENTS + 1) * 2)
  }
}
