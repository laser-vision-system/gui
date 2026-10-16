# Development Environment Set-up
## Step 1: Check if you have node
In linux you can use the cl command below to check.
```
node -v
```
To install node.js please click the link [here](https://nodejs.org/en/download)
## Step 2: Clone the repo
Make sure you are signed into GitHub and have it downloaded on your device then use the following cl command to clone the gui repo.
```
git clone https://github.com/laser-vision-system/gui.git
```
## Step 3: Development Set-up
### Install Dependencies
In the gui directory run the following cl command to download the needed dependencies.
```
npm install
```
### Run Development Environment
To run the development environment simply run this cl command:
```
npm run dev
```
Then click on the provided link or go to http://localhost:5173/ where the development environment is hosted on your device.
## Step 4: Production Build and Deployment
### Vite Configuration (BEFORE YOU BUILD)

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

### The Build Command
To build for production and deployment run this command:
```
npm run build
```
This will generate a heavily condensed and optimized build in the dist directory. Make sure put the contents of all items from the dist directory into the directory where the web files are hosted on your chosen web server.

Don't forget to configure the vite config's base to match the path if you have nested the build files in the document root as shown above.
