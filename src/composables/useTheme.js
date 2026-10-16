import { ref, watch, onMounted } from 'vue'
// By declaring the state at the module level outside of the component
// Meaning that it is created once and shared across all components

// savedTheme ?? osTheme returns the right hand variable only if the left hand is null or undefined
const getInitialTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  const osTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  return savedTheme ?? osTheme
}
// This is known as the Vue 3 singleton composable pattern
// // As every component that calls the theme shares the same reference
const theme = ref(getInitialTheme())

// set up the watcher outside of the component
watch(theme, (newTheme) => {
  localStorage.setItem('theme', newTheme)
  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}, { immediate: true }) // immediately run the watcher on mount


export function useTheme() {
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }
  return { theme, toggleTheme }
}
