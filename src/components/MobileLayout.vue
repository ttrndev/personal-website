<script setup lang="ts">
import FooterBlock from './FooterBlock.vue'
import IntroBlock from './IntroBlock.vue'
import SenkoArt from './SenkoArt.vue'
</script>

<!--
  Portrait layout for phones and tablets: text on top, Senko in the bottom-right
  corner, the credits fading in over her feet.

  Mobile browsers slide their address bar / toolbar away while you scroll, and
  the viewport height changes with it. To keep that smooth, nothing here is
  sized by the *current* viewport height (that would re-layout and re-draw the
  big SVG on every frame of the slide). Instead:
    - sizes use the small viewport height (--sh), which never changes, and
    - Senko and the credits are `position: fixed; bottom: 0`, so the browser
      itself moves them along with the toolbar.

  Type sizes are multiples of --vw (1% of the width, capped so tablets don't get
  billboard-sized type). The page only scrolls on screens too short for the text.
-->
<template>
  <div class="mob">
    <main class="mob__intro">
      <IntroBlock />
    </main>

    <SenkoArt class="mob__senko" />
    <FooterBlock class="mob__footer" />
  </div>
</template>

<style scoped>
.mob {
  /* The viewport height with the toolbars showing: the one value that stays put. */
  --sh: 100vh;
  --vw: min(1vw, 7.2px);
  --pad: calc(var(--vw) * 6);
  --fs-title: calc(var(--vw) * 9.2);
  --fs-body: max(14px, calc(var(--vw) * 4.4));
  --fs-small: max(10px, calc(var(--vw) * 2.7));
  --lh: 1.2;
  --lh-title: 1.04;

  position: relative;
  z-index: 1;
  min-height: var(--sh);
  padding-top: max(var(--pad), env(safe-area-inset-top));
  overflow-x: clip;
}

@supports (height: 100svh) {
  .mob {
    --sh: 100svh;
  }
}

/* Above Senko, so on a very short screen the text stays readable if they meet. */
.mob__intro {
  position: relative;
  z-index: 2;
  padding-inline: var(--pad);
}

/* As big as the space under the text allows (about 68vw of it is text), never
   wider than the screen and never tiny. */
.mob__senko {
  position: fixed;
  right: 0;
  bottom: 0;
  z-index: 1;
  height: max(
    calc(var(--vw) * 45),
    min(calc(var(--vw) * 119), calc(var(--sh) - var(--vw) * 68))
  );
  width: auto;
}

/* Sits over the bottom of the artwork and fades it into the page. */
.mob__footer {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  padding: calc(var(--vw) * 14) var(--pad) max(var(--pad), env(safe-area-inset-bottom));
  background: linear-gradient(to bottom, transparent, var(--bg) 62%);
}
</style>
