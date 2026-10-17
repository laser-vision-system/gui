# Development Environment Set-up
The following steps will guide you through the development process with the framework and tools used.
## Step 1: Check if you have node.js 
In linux you can use the cl below to check:
```
node -v
```
To install node.js please click the link [`here`](https://nodejs.org/en/download)
## Step 2: Clone the repo
Use the following cl to clone the gui repo:
```
git clone https://github.com/laser-vision-system/gui.git
```
To push changes to the repo you need to be logged into GitHub and have the correct aurthrisation. 
## Step 3: Development Set-up
### Install Dependencies
In the `/gui` directory run the following cl  to download the needed dependencies.
```
npm install
```
### Run Development Environment
To run the development environment simply run this cl:
```
npm run dev
```
Then click on the provided link or go to http://localhost:5173/ where the development environment is hosted on your device.
## Step 4: Production Build
### The Build Command
To build for production and deployment run this command:
```
npm run build
```
This will generate a heavily condensed and optimized build in the dist directory. Make sure put the contents of all items from the dist directory into the directory where the web files are hosted on your chosen web server.

Don't forget to configure the vite config's base to match the path if you have nested the build files in the document root as shown above.
