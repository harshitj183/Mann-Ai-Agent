FROM node:20-alpine

WORKDIR /app/backend/database

COPY backend/database/package*.json ./

# drizzle-kit is a devDependency — needed for migrations
RUN npm install

COPY backend/database/drizzle.config.js ./
COPY backend/database/src ./src
COPY backend/database/migrations ./migrations

CMD ["npm", "run", "migrate"]
