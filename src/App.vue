<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BrushBackground from './components/BrushBackground.vue'
import DesktopLayout from './components/DesktopLayout.vue'
import MobileLayout from './components/MobileLayout.vue'
import { useMediaQuery } from './composables/useMediaQuery'

/** Portrait screens (phones, tablets held upright) and any narrow window get the mobile layout. */
const isMobile = useMediaQuery('(orientation: portrait), (max-width: 640px)')

const ready = ref(false)

onMounted(async () => {
  // Start the show once the wide font is in, otherwise the text would jump.
  const fontLoaded = document.fonts
    .load('1em "RF Dewi Expanded"')
    .catch(() => undefined)
  const timeout = new Promise((resolve) => setTimeout(resolve, 1500))
  await Promise.race([fontLoaded, timeout])
  ready.value = true
})
</script>

<template>
  <div class="page" :class="{ 'is-ready': ready }">
    <!-- Lives outside the layouts, so switching layout never restarts the stroke. -->
    <BrushBackground :compact="isMobile" :play="ready" />

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
