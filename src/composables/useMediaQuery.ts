import { onScopeDispose, ref, type Ref } from 'vue'

/** A reactive `window.matchMedia(query).matches`. Correct from the very first render. */
export function useMediaQuery(query: string): Ref<boolean> {
  const mql = window.matchMedia(query)
  const matches = ref(mql.matches)

  const onChange = (event: MediaQueryListEvent) => {
    matches.value = event.matches
  }
  mql.addEventListener('change', onChange)
  onScopeDispose(() => mql.removeEventListener('change', onChange))

  return matches
}
