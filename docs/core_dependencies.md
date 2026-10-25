# Framework and Major Dependencies  
## Bootstrap 5.3.8

Using only for the grid system from Bootstrap to get a responsive layout, Other styling will be handled via custom CSS in the style.css file with some exceptions of component scoped styles.

## Vue.js 3.5.34

Using the Composition API as the primary API as it provides a more flexible and reactive way to manage component state as well as being a lightweight alternative to the Options API. For more on the vue.js framework click [here](https://vuejs.org/)

## Vite 8.0.13
[Vite](https://vite.dev/) is a Web application development tool aimed a fast and leaner development experience. Vite consist of two key parts the dev server which is accessed by `npm run dev` and a build command `npm run build` which builds the code with [Rolldown](https://rolldown.rs/) providing solid optimization. 

## Vite Plugin SingleFile 2.3.3
This vite plug in allows us to create a single html file deployable build, which can be viewed outside a development environment without a webserver to host it. This was a key method used for client feedback throughout the iterations of the GUI.

To enable the single file build in the vite.config.js uncomment the viteSingleFile plugin in the plugin section, then run `npm run build`
```
export default defineConfig({
  base: "",
  plugins: [
    vue(),
    // uncoment below for single file build
    viteSingleFile()
  ],
  ... 
})
```
