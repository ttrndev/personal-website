<script setup lang="ts">
import logo from '../assets/clownslogo.svg'
import { site } from '../content'
</script>

<template>
  <a class="clown" :href="site.home" aria-label="timtaran.clwn.org">
    <img class="clown__img" :src="logo" alt="" width="16" height="16" draggable="false" />
  </a>
</template>

<style scoped>
.clown {
  display: inline-block;
  height: 0.8em;
  vertical-align: -0.06em;
  border-radius: 0.1em;
}

.clown__img {
  height: 100%;
  width: auto;
  /* It's a 16×16 pixel-art sprite: keep the pixels crisp at any size. */
  image-rendering: pixelated;
}

.clown:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 0.2em;
}
</style>
