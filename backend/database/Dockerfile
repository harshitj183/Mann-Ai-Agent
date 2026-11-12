FROM node:20-alpine

WORKDIR /app/backend/database

COPY backend/database/package*.json ./

RUN npm ci

COPY backend/database/drizzle.config.js ./
COPY backend/database/src ./src
COPY backend/database/migrations ./migrations

CMD ["npm", "run", "migrate"]
