<script setup lang="ts">
import { site } from '../content'
</script>

<template>
  <footer class="foot reveal" style="--i: 4">
    <p class="foot__contact">{{ site.contact }}</p>
    <p class="foot__credit">
      {{ site.artwork.prefix }}
      <a class="link" :href="site.artwork.href" target="_blank" rel="noopener noreferrer">
        {{ site.artwork.name }}
      </a>
    </p>
  </footer>
</template>

<style scoped>
.foot__contact {
  font-size: var(--fs-small);
  line-height: 1.15;
  letter-spacing: 0.08em;
  color: var(--ink-faint);
}

.foot__credit {
  font-size: var(--fs-body);
  line-height: var(--lh);
}
</style>
