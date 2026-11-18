import vertexSource from './brush.vert.glsl?raw'
import fragmentSource from './brush.frag.glsl?raw'
import { DAB_SIZE, generateDab } from './dab'
import {
  BRUSH,
  dabCountFor,
  layoutPath,
  measurePathLength,
  type Genome,
  type PathLayout,
} from './genome'

/** Stroke colour, sampled from the reference artwork (#49423a). */
const INK: [number, number, number] = [73 / 255, 66 / 255, 58 / 255]

export interface BrushOptions {
  genome: Genome
  /** Length of the draw-on animation in ms. */
  duration?: number
  /** Skip the animation and paint the finished stroke straight away. */
  reducedMotion?: boolean
}

function easeInOutQuad(k: number): number {
  return k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k)
}

/**
 * Paints one procedurally generated brush stroke with WebGL2, by stamping a
 * speckled dab hundreds of times along a generated curve.
 *
 * The canvas keeps its pixels between frames, so while the stroke is being
 * drawn each frame only stamps the handful of dabs that are new. Once the
 * stroke is complete nothing runs at all until the window is resized.
 */
export class BrushRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly genome: Genome
  private readonly duration: number
  private readonly reducedMotion: boolean

  private gl!: WebGL2RenderingContext
  private program: WebGLProgram | null = null
  private vao: WebGLVertexArrayObject | null = null
  private dabTexture: WebGLTexture | null = null
  private uniforms: Record<string, WebGLUniformLocation | null> = {}
  private readonly dabPixels: Uint8Array

  private cssWidth = 0
  private cssHeight = 0
  private compact = false
  private layout: PathLayout | null = null
  private dabCount = 0

  /** How much of the stroke has been painted, 0 → 1. */
  private progress = 0
  /** Number of dabs already on the canvas. */
  private stamped = 0
  private startAt = 0
  private raf = 0
  private contextLost = false

  constructor(canvas: HTMLCanvasElement, options: BrushOptions) {
    this.canvas = canvas
    this.genome = options.genome
    this.duration = options.duration ?? 2800
    this.reducedMotion = options.reducedMotion ?? false

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true, // we draw incrementally, so keep what is there
      powerPreference: 'low-power',
    })
    if (!gl) throw new Error('WebGL2 is not available')
    this.gl = gl

    // Generated once; kept around so a lost context can be rebuilt instantly.
    this.dabPixels = generateDab(this.genome.seed)

    this.init()
    canvas.addEventListener('webglcontextlost', this.onContextLost)
    canvas.addEventListener('webglcontextrestored', this.onContextRestored)
  }

  /** Switch between the landscape and the portrait/phone geometry. */
  setCompact(compact: boolean): void {
    if (compact === this.compact) return
    this.compact = compact
    this.updateLayout()
    this.repaint()
  }

  /** Match the drawing buffer to the canvas' size on screen. */
  resize(cssWidth: number, cssHeight: number, pixelRatio: number): void {
    this.cssWidth = cssWidth
    this.cssHeight = cssHeight
    this.canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio))
    this.canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio))
    this.updateLayout()
    this.repaint() // resizing clears the canvas, so stamp everything again
  }

  /** Start the draw-on animation. */
  play(delayMs = 0): void {
    if (this.reducedMotion) {
      this.progress = 1
      this.catchUp()
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
      if (this.dabTexture) gl.deleteTexture(this.dabTexture)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }

  // ---------------------------------------------------------------------------

  private readonly tick = (now: number): void => {
    const k = Math.min(1, Math.max(0, (now - this.startAt) / this.duration))
    this.progress = easeInOutQuad(k)
    this.catchUp()
    this.raf = k < 1 ? requestAnimationFrame(this.tick) : 0
  }

  /** Stamp whichever dabs the animation has reached but the canvas doesn't have yet. */
  private catchUp(): void {
    const target = Math.floor(this.progress * this.dabCount + 1e-6)
    if (target > this.stamped) {
      this.stamp(this.stamped, target)
      this.stamped = target
    }
  }

  /** Throw the canvas away and redraw everything painted so far. */
  private repaint(): void {
    const { gl } = this
    if (this.contextLost) return
    this.stamped = Math.floor(this.progress * this.dabCount + 1e-6)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    this.stamp(0, this.stamped)
  }

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault() // required, otherwise the context is never restored
    this.contextLost = true
    cancelAnimationFrame(this.raf)
  }

  private readonly onContextRestored = (): void => {
    this.contextLost = false
    this.init()
    this.repaint()
    if (this.progress > 0 && this.progress < 1) this.raf = requestAnimationFrame(this.tick)
  }

  private updateLayout(): void {
    if (this.cssWidth === 0 || this.cssHeight === 0) return
    this.layout = layoutPath(this.cssWidth, this.cssHeight, this.compact)
    const length = measurePathLength(this.genome, this.layout)
    this.dabCount = dabCountFor(length, this.layout.scale)
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
      'uView', 'uA', 'uB', 'uWave', 'uPress', 'uCount', 'uFirst',
      'uRadius', 'uScatter', 'uJitter', 'uSeed', 'uDab', 'uInk',
    ]) {
      this.uniforms[name] = gl.getUniformLocation(program, name)
    }

    // The geometry is generated from gl_VertexID / gl_InstanceID, so there are
    // no buffers, but WebGL2 still wants a (blank) vertex array object bound.
    this.vao = gl.createVertexArray()

    // The dab. Plain linear filtering (no mipmaps): the shader thresholds the
    // value, and blurring it would thin out the finest specks.
    this.dabTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.dabTexture)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, DAB_SIZE, DAB_SIZE, 0, gl.RED, gl.UNSIGNED_BYTE, this.dabPixels)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  /** Stamp dabs `from` (inclusive) to `to` (exclusive). */
  private stamp(from: number, to: number): void {
    const { gl, layout, uniforms: u, genome } = this
    if (!layout || !this.program || this.contextLost || to <= from) return

    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.useProgram(this.program)
    gl.bindVertexArray(this.vao)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.dabTexture)

    gl.uniform2f(u.uView, this.cssWidth, this.cssHeight)
    gl.uniform2f(u.uA, layout.a[0], layout.a[1])
    gl.uniform2f(u.uB, layout.b[0], layout.b[1])
    gl.uniform3fv(u.uWave, genome.waves.flatMap((w) => [w.amp * layout.waveScale, w.freq, w.phase]))
    gl.uniform3fv(u.uPress, genome.pressure.flatMap((w) => [w.amp, w.freq, w.phase]))
    gl.uniform1f(u.uCount, this.dabCount)
    gl.uniform1f(u.uFirst, from)
    gl.uniform1f(u.uRadius, BRUSH.radius * layout.scale)
    gl.uniform1f(u.uScatter, BRUSH.scatter * layout.scale)
    gl.uniform1f(u.uJitter, BRUSH.sizeJitter)
    gl.uniform2f(u.uSeed, genome.noiseOffset[0], genome.noiseOffset[1])
    gl.uniform1i(u.uDab, 0)
    gl.uniform3f(u.uInk, INK[0], INK[1], INK[2])

    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, to - from)
  }
}
