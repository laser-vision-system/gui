# GUI

## Framework Versions
### Bootstrap 5.3.8

Using only the grid system from Bootstrap to get a responsive layout, Other stlying will be handled via custom CSS.

### Vue.js 3.5.34

Using the Composition API as the primary API as it provides a more flexible and reactive way to manage component state as well as being a lightweight alternative to the Options API.

## Initialise and Work in the Node.js envrioment 

### In the laser-intensity-monitor-gui directory run these commands

To initialise the project and install dependencies, run:
```
npm install
```

To run a dev server simply run this command:
```
npm run dev
```

To build for production and deployment run this command:
```
npm run build
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
