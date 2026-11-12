FROM node:20-alpine

WORKDIR /app/backend/agent-service

COPY backend/agent-service/package*.json ./
COPY backend/database /app/backend/database

RUN npm ci

COPY backend/agent-service/src ./src

EXPOSE 3004

CMD ["npm", "start"]