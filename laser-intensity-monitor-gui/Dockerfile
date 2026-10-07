# Source - https://stackoverflow.com/a/69808007
# Posted by oshell, modified by community. See post 'Timeline' for change history
# Retrieved 2026-09-11, License - CC BY-SA 4.0

FROM --platform=$BUILDPLATFORM node:lts-alpine
# install simple http server for serving static content
RUN npm install -g http-server
# make the 'app' folder the current working directory
WORKDIR /app
# copy 'package.json' to install dependencies
COPY package*.json ./
# install dependencies
RUN npm install
# copy files and folders to the current working directory (i.e. 'app' folder)
COPY . .
# build app for production with minification
RUN npm run build
EXPOSE 5173
CMD [ "http-server", "dist" ]
