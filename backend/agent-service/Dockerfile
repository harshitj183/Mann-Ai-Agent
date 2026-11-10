FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY src ./src

EXPOSE 3004

CMD ["npm", "start"]