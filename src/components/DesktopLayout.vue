<script setup lang="ts">
import FooterBlock from './FooterBlock.vue'
import IntroBlock from './IntroBlock.vue'
import SenkoArt from './SenkoArt.vue'
</script>

<!--
  Landscape layout. It is drawn like a 1920×1080 poster that scales with the
  viewport: --u is 1/100 of the largest 16:9 stage that fits the screen, and
  every size below is a multiple of it. Text hugs the left edge, Senko is glued
  to the bottom-right corner, whatever the aspect ratio.
-->
<template>
  <div class="desk">
    <main class="desk__intro">
      <IntroBlock />
    </main>
    <SenkoArt class="desk__senko" />
    <FooterBlock class="desk__footer" />
  </div>
</template>

<style scoped>
.desk {
  --u: min(1vw, 1.7778vh);
  --u: min(1vw, 1.7778dvh);
  /* Measured against the reference (type sizes, line pitch and the gap under the title). */
  --fs-title: calc(var(--u) * 3.36);
  --fs-body: max(11px, calc(var(--u) * 1.675));
  --fs-small: max(9px, calc(var(--u) * 0.83));
  --lh: 1.18;
  --title-gap: calc(var(--u) * 1.25);

  position: relative;
  z-index: 1;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.desk__intro {
  position: absolute;
  top: calc(var(--u) * 2.47);
  left: calc(var(--u) * 2.72);
}

.desk__senko {
  position: absolute;
  right: 0;
  bottom: 0;
  height: calc(var(--u) * 43.65);
  width: auto;
}

.desk__footer {
  position: absolute;
  left: calc(var(--u) * 2.72);
  bottom: calc(var(--u) * 1.4);
}
</style>
