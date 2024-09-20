FROM node:20-slim AS base
COPY . /app
WORKDIR /app

RUN npm install
CMD [ "node", "kafkaServer.js" ]