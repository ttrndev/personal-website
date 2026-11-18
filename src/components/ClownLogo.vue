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
  margin-left: 0.2em;
  vertical-align: -0.06em;
  border-radius: 0.1em;
  transition: transform 0.25s cubic-bezier(0.3, 1.6, 0.5, 1);
}

.clown__img {
  height: 100%;
  width: auto;
  /* It's a 16×16 pixel-art sprite: keep the pixels crisp at any size. */
  image-rendering: pixelated;
}

.clown:hover,
.clown:focus-visible {
  transform: translateY(-0.1em) rotate(-8deg) scale(1.12);
}

.clown:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 0.2em;
}

@media (prefers-reduced-motion: reduce) {
  .clown {
    transition: none;
  }
}
</style>
