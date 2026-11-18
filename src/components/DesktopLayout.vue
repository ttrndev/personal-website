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

  This layout is also used by phones held sideways, so it follows the same
  rule as MobileLayout: sizes come from the *small* viewport height (which
  doesn't change while the browser's toolbar slides away) and the bottom items
  are `position: fixed`, so the browser moves them smoothly instead of the page
  re-laying out on every frame.
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
  --sh: 100vh; /* the viewport height with the toolbars showing; stays put */
  --u: min(1vw, 1.7778vh);
  /* Measured against the reference (type sizes, line pitch and the gap under the title). */
  --fs-title: calc(var(--u) * 3.36);
  --fs-body: max(11px, calc(var(--u) * 1.675));
  --fs-small: max(9px, calc(var(--u) * 0.83));
  --lh: 1.18;
  --title-gap: calc(var(--u) * 1.25);

  position: relative;
  z-index: 1;
  height: var(--sh);
  overflow: hidden;
}

@supports (height: 100svh) {
  .desk {
    --sh: 100svh;
    --u: min(1vw, 1.7778svh);
  }
}

.desk__intro {
  position: absolute;
  top: calc(var(--u) * 2.47);
  left: calc(var(--u) * 2.72);
}

.desk__senko {
  position: fixed;
  right: 0;
  bottom: 0;
  height: calc(var(--u) * 43.65);
  width: auto;
}

.desk__footer {
  position: fixed;
  left: calc(var(--u) * 2.72);
  bottom: calc(var(--u) * 1.4);
}
</style>
