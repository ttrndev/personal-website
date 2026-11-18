<script setup lang="ts">
import { onMounted, ref } from 'vue'
import senko from '../assets/senko.svg'

const img = ref<HTMLImageElement | null>(null)
/** She fades in only once her picture has really arrived, however slow the connection. */
const loaded = ref(false)

onMounted(() => {
  // Already in the cache? Then `load` fired before we started listening.
  if (img.value?.complete && img.value.naturalWidth > 0) loaded.value = true
})
</script>

<!--
  The artwork is cropped by its own viewBox (tail on the right, body at the
  bottom), so it is meant to be glued to the bottom-right corner of the screen.
-->
<template>
  <img
    ref="img"
    class="senko reveal-art"
    :class="{ 'is-loaded': loaded }"
    :src="senko"
    width="704"
    height="838"
    alt="Senko, a golden-haired fox girl in shrine maiden clothes, smiling and making a playful gesture"
    draggable="false"
    decoding="async"
    @load="loaded = true"
  />
</template>

<style scoped>
.senko {
  user-select: none;
  -webkit-user-drag: none;
}
</style>
