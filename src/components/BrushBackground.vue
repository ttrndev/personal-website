<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BrushRenderer } from '../brush/BrushRenderer'
import { createGenome } from '../brush/genome'

const props = defineProps<{
  /** Portrait / phone geometry. */
  compact: boolean
  /** Flips to true when the page is ready for the brush to start painting. */
  play: boolean
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let renderer: BrushRenderer | null = null
let observer: ResizeObserver | null = null

/**
 * A new stroke on every visit. Open the page with `?seed=1234` to pin one
 * (handy for screenshots and for finding a stroke you like).
 */
function resolveSeed(): number {
  const raw = new URLSearchParams(window.location.search).get('seed')
  const pinned = raw === null ? Number.NaN : Number.parseInt(raw, 10)
  return Number.isFinite(pinned) ? pinned >>> 0 : (Math.random() * 2 ** 32) >>> 0
}

onMounted(() => {
  const el = canvas.value
  if (!el) return

  const seed = resolveSeed()
  try {
    renderer = new BrushRenderer(el, {
      genome: createGenome(seed),
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    })
  } catch (error) {
    // No WebGL2: the page simply keeps its plain background.
    console.warn('[brush] WebGL2 is unavailable, skipping the background stroke.', error)
    return
  }
  console.info(`[brush] seed ${seed} — add ?seed=${seed} to the URL to get this stroke again`)

  renderer.setCompact(props.compact)

  const sync = () => {
    renderer?.resize(el.clientWidth, el.clientHeight, Math.min(window.devicePixelRatio || 1, 2))
  }
  observer = new ResizeObserver(sync)
  observer.observe(el)
  sync()

  if (props.play) renderer.play(150)
})

watch(
  () => props.compact,
  (compact) => renderer?.setCompact(compact),
)

watch(
  () => props.play,
  (play) => {
    if (play) renderer?.play(150)
  },
)

onBeforeUnmount(() => {
  observer?.disconnect()
  renderer?.dispose()
  renderer = null
})
</script>

<template>
  <canvas ref="canvas" class="brush" aria-hidden="true" />
</template>

<style scoped>
.brush {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  /* The *large* viewport, so mobile toolbars sliding in and out don't make the stroke jump. */
  height: 100vh;
  height: 100lvh;
  z-index: 0;
  pointer-events: none;
}
</style>
