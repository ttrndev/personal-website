<script setup lang="ts">
import FooterBlock from './FooterBlock.vue'
import IntroBlock from './IntroBlock.vue'
import SenkoArt from './SenkoArt.vue'
</script>

<!--
  Portrait layout for phones and tablets. A single column: text on top, Senko
  filling whatever height is left, the credits fading in over her feet.
  Sizes are multiples of --vw (1% of the width, capped so tablets don't get
  billboard-sized type). The page may scroll on very short screens instead of
  letting things overlap.
-->
<template>
  <div class="mob">
    <main class="mob__intro">
      <IntroBlock />
    </main>

    <div class="mob__art">
      <SenkoArt class="mob__senko" />
    </div>

    <FooterBlock class="mob__footer" />
  </div>
</template>

<style scoped>
.mob {
  --vw: min(1vw, 7.2px);
  --pad: calc(var(--vw) * 6);
  --fs-title: calc(var(--vw) * 9.2);
  --fs-body: max(14px, calc(var(--vw) * 4.4));
  --fs-small: max(10px, calc(var(--vw) * 2.7));
  --lh: 1.2;
  --lh-title: 1.04;

  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto minmax(calc(var(--vw) * 62), 1fr) auto;
  min-height: 100vh;
  min-height: 100dvh;
  padding-top: max(var(--pad), env(safe-area-inset-top));
  overflow-x: clip;
}

.mob__intro {
  padding-inline: var(--pad);
}

.mob__art {
  position: relative;
}

.mob__senko {
  position: absolute;
  right: 0;
  bottom: 0;
  height: 100%;
  width: auto;
  max-width: 100%;
  object-fit: contain;
  object-position: right bottom;
}

/* Sits over the bottom of the artwork and fades it into the page. */
.mob__footer {
  position: relative;
  z-index: 2;
  margin-top: calc(var(--vw) * -22);
  padding: calc(var(--vw) * 14) var(--pad) max(var(--pad), env(safe-area-inset-bottom));
  background: linear-gradient(to bottom, transparent, var(--bg) 62%);
}
</style>
