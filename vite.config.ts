import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Relative URLs, so the same build works at the root of a domain and under a
  // GitHub Pages project path (https://<user>.github.io/<repo>/). Fine here
  // because the site is a single page with no client-side routing.
  base: './',
})
