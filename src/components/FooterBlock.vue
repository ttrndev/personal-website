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
  line-height: 1.3;
}

.foot__credit {
  font-size: var(--fs-body);
  line-height: var(--lh);
}
</style>
