# GUI 
## Development Environment Set-up
### Step 1: Check if you have node
In linux you can use the cl command below to check.
```
node -v
```
To install node.js please click the link [here](https://nodejs.org/en/download)
### Step 2: Clone the repo
Make sure you are signed into GitHub and have it downloaded on your device then use the following cl command to clone the gui repo.
```
git clone https://github.com/laser-vision-system/gui.git
```
### Step 3: Development Set-up
#### Install Dependencies
In the gui directory run the following cl command to download the needed dependencies.
```
npm install
```
#### Run Development Environment
To run the development environment simply run this cl command:
```
npm run dev
```
Then click on the provided link or go to http://localhost:5173/ where the development environment is hosted on your device.
### Step 4: Production Build and Deployment
#### Vite Configuration (BEFORE YOU BUILD)

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

#### The Build Command
To build for production and deployment run this command:
```
npm run build
```
This will generate a heavily condensed and optimized build in the dist directory. Make sure put the contents of all items from the dist directory into the directory where the web files are hosted on your chosen web server.

Don't forget to configure the vite config's base to match the path if you have nested the build files in the document root as shown above.

## Framework and Major Dependencies  
### Bootstrap 5.3.8

Using only for the grid system from Bootstrap to get a responsive layout, Other styling will be handled via custom CSS in the style.css file with some exceptions of component scoped styles.

### Vue.js 3.5.34

Using the Composition API as the primary API as it provides a more flexible and reactive way to manage component state as well as being a lightweight alternative to the Options API. For more on the vue.js framework click [here](https://vuejs.org/)

### Vite 8.0.13
[Vite](https://vite.dev/) is a Web application development tool aimed a fast and leaner development experience. Vite consist of two key parts the dev server which is accessed by `npm run dev` and a build command `npm run build` which builds the code with [Rolldown](https://rolldown.rs/) providing solid optimization. 

### Vite Plugin SingleFile 2.3.3
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
## Docker image

In order to run our docker image you will need to pull the image from github. to start off with make sure you are logged in to login to the github docker registery by doing the following:
```
# Create a new personal access token (classic) with the appropriate scopes for the tasks you want to accomplish. If your organization requires SSO, you must enable SSO for your new token.
# Select the read:packages scope to download container images and read their metadata. 
export CR_PAT=YOUR_TOKEN 
echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin 
```
After you are logged in run the following command to pull the image:
```
# For raspbery pi's or MAC machines
docker pull ghcr.io/cos40005-p12/gui-arm64:BRANCH
# For other hardware 
docker pull ghcr.io/cos40005-p12/gui-amd64:BRANCH
```
If you want to make and run a container for testing run the following:
```
sudo docker run -p 5173:8080 --rm --name gui ghcr.io/cos40005-p12/gui-CPUARCHITECTURE:BRANCH
```
For deployment on the server instead run the following:
```
sudo docker run -p 5173:8080 --name gui ghcr.io/cos40005-p12/gui-CPUARCHITECTURE:BRANCH
```
