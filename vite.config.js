import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: "",
  plugins: [
    vue(),
    // uncomment below for single file build
    //viteSingleFile()
  ],
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:8080', // changes this to the address of the server for the live demo
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
