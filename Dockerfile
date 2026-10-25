# Source - https://stackoverflow.com/a/69808007
# Posted by oshell, modified by community. See post 'Timeline' for change history
# Retrieved 2026-09-11, License - CC BY-SA 4.0

FROM --platform=$BUILDPLATFORM node:lts-alpine
# make the 'app' folder the current working directory
WORKDIR /app
# copy files and folders to the current working directory (i.e. 'app' folder)
COPY . .
# copy 'package.json' to install dependencies
RUN npm install
# build app for production with minification
RUN npm run build
CMD [ "npm", "run", "dev", "--", "--host" ]
