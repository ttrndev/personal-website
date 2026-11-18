<script setup lang="ts">
import { site } from '../content'
</script>

<template>
  <nav class="socials" aria-label="Socials">
    <p class="socials__label">{{ site.socialsLabel }}</p>
    <ul>
      <li v-for="social in site.socials" :key="social.href">
        <a class="link" :href="social.href" target="_blank" rel="noopener noreferrer">
          {{ social.label }}
        </a>
      </li>
    </ul>
  </nav>
</template>
