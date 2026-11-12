FROM node:20-alpine

WORKDIR /app/backend/auth-service

COPY backend/auth-service/package*.json ./
COPY backend/database /app/backend/database

RUN npm ci

COPY backend/auth-service/src ./src

EXPOSE 3001

CMD ["npm", "start"]