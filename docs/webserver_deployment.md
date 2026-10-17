# Vite Configuration (BEFORE YOU BUILD)
The build files must be stored in the document root of you webserver. For example in an apache webserver the document root for a website is:
```
/var/www/html
```
You can either deploy the contents of the dist directory in the document root or in a nested directory inside the document root.

If you have picked to deploy the build in a nested directory, make sure to configure the `base` variable in the vite.config.js file. 

```
export default defineConfig({
  // this assumes that the built files are stored at 
  // /var/www/html/CUSTOM/NESTED/DRIECTORY
  base: "CUSTOM/NESTED/DRIECTORY",
  ... 
})
```
