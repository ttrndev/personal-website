<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BrushBackground from './components/BrushBackground.vue'
import DesktopLayout from './components/DesktopLayout.vue'
import MobileLayout from './components/MobileLayout.vue'
import { useMediaQuery } from './composables/useMediaQuery'

/** Portrait screens (phones, tablets held upright) and any narrow window get the mobile layout. */
const isMobile = useMediaQuery('(orientation: portrait), (max-width: 640px)')

/** The text fades in once the wide font is here, otherwise it would jump when the font swaps in. */
const ready = ref(false)

onMounted(async () => {
  const fontLoaded = document.fonts.load('1em "RF Dewi Expanded"').catch(() => undefined)
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000))
  await Promise.race([fontLoaded, timeout])
  ready.value = true
})
</script>

<template>
  <div class="page" :class="{ 'is-ready': ready }">
    <!-- Lives outside the layouts, so switching layout never restarts the stroke.
         It doesn't wait for the font: the brush starts painting right away. -->
    <BrushBackground :compact="isMobile" />

    <MobileLayout v-if="isMobile" />
    <DesktopLayout v-else />
  </div>
</template>

<style scoped>
.page {
  position: relative;
  isolation: isolate;
}
</style>
