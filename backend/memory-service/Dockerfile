FROM node:20-alpine

WORKDIR /app/backend/memory-service

COPY backend/memory-service/package*.json ./
COPY backend/database /app/backend/database

RUN npm ci

COPY backend/memory-service/src ./src

EXPOSE 3003

CMD ["npm", "start"]
