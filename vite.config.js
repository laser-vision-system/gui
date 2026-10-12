import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  // when deployed add the  path loaction of the development build files on the server to the base variable.
  base: "",
  plugins: [
    vue(),
    // uncoment below for single file build
    //viteSingleFile()
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // changes this to the address of the server for the live demo
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
