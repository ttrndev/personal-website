<script setup lang="ts">
import senko from '../assets/senko.svg'
</script>

<!--
  The artwork is cropped by its own viewBox (tail on the right, body at the
  bottom), so it is meant to be glued to the bottom-right corner of the screen.
-->
<template>
  <img
    class="senko reveal-art"
    :src="senko"
    width="704"
    height="838"
    alt="Senko, a golden-haired fox girl in shrine maiden clothes, smiling and making a playful gesture"
    draggable="false"
    decoding="async"
  />
</template>

<style scoped>
.senko {
  user-select: none;
  -webkit-user-drag: none;
}
</style>
