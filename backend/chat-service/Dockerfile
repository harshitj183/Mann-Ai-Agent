FROM node:20-alpine

WORKDIR /app/backend/chat-service

COPY backend/chat-service/package*.json ./
COPY backend/database /app/backend/database

RUN npm ci

COPY backend/chat-service/src ./src

EXPOSE 3002

CMD ["npm", "start"]