### STAGE 1: Build ###
FROM node:12.3-alpine AS build
RUN apk add yarn git
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install --production=true

COPY . .

RUN yarn add @nestjs/cli@7.4.1
RUN yarn build

### STAGE 2: Run ###

FROM node:12.3-alpine

RUN  npm install -g serverless@1.74.1

RUN serverless --version

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
RUN apk add yarn git

WORKDIR /serverless

COPY ./templates/serverless/package.json .

RUN npm install

RUN ls

WORKDIR /templates

COPY ./templates/nodejs/serverless.yml .

COPY ./templates/nodejs/package.json .

COPY ./templates/nodejs/webpack.config.js .

COPY ./templates/serverless/config.yaml .

ENV SERVERLESS_YML_PATH '/templates/serverless.yml'

ENV CLUSTER_CONFIG_YML_PATH '/templates/config.yaml'

ENV SERVERLESS_DEPENDENCIES_PATH '/templates/package.json'

ENV SERVERLESS_WEBPACK_PATH '/templates/webpack.config.js'

RUN mkdir /root/.kube
RUN touch /root/.kube/config

WORKDIR /

CMD ["node", "dist/main"]
