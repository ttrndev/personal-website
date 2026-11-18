<script setup lang="ts">
import { site } from '../content'
import ClownLogo from './ClownLogo.vue'
import SocialLinks from './SocialLinks.vue'
</script>

<!--
  Title, lead text and socials. Sizes come from --fs-title / --fs-body / --lh,
  which each layout sets for itself.
-->
<template>
  <div class="intro">
    <h1 class="intro__title reveal" style="--i: 0">{{ site.title }}</h1>

    <p class="intro__lead reveal" style="--i: 1">
      <span class="intro__line">{{ site.lead[0] }}</span>
      <span class="intro__line">{{ site.lead[1] }} <ClownLogo /></span>
    </p>

    <SocialLinks class="intro__socials reveal" style="--i: 2" />
  </div>
</template>

<style scoped>
.intro {
  font-size: var(--fs-body);
  line-height: var(--lh);
}

.intro__title {
  font-size: var(--fs-title);
  font-weight: 400;
  line-height: var(--lh-title, 1);
  margin-bottom: var(--title-gap, calc(var(--fs-body) * 0.2));
}

.intro__line {
  display: block;
}

/* One blank line between the lead and the socials, like the original. */
.intro__socials {
  margin-top: calc(var(--fs-body) * var(--lh));
}
</style>
