# --- Build stage ------------------------------------------------------------
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci --omit=dev=false || npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Runtime stage ----------------------------------------------------------
FROM node:20-slim
WORKDIR /app

# Install mongodb-database-tools for mongodump
RUN apt-get update \
 && apt-get install -y --no-install-recommends wget ca-certificates gnupg curl \
 && rm -rf /var/lib/apt/lists/* \
 && echo "deb [trusted=yes] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/6.0 main" > /etc/apt/sources.list.d/mongodb-org-6.0.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends mongodb-database-tools \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY package.json ./
RUN npm pkg delete devDependencies && npm ci --omit=dev

# Create backup dir
RUN mkdir -p /app/backups

EXPOSE 8080
CMD ["node", "dist/index.js"]

