FROM node:20-alpine

RUN apk update && apk upgrade && \
    apk add --no-cache git

WORKDIR /home/node/app

COPY package*.json ./
RUN npm ci --only-production --legacy-peer-deps
COPY . .

CMD [ "node", "index.js" ]
