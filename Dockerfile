# Multi-stage build for the NestJS API (docs/architecture.md "Deployment topology").
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
COPY package*.json ./
# Deliberately includes devDependencies: db:migrate/db:seed run via
# ts-node inside this same image (docker compose exec backend npm run
# db:migrate), so ts-node/typescript/tsconfig-paths must be present.
RUN npm ci
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
COPY scripts ./scripts
COPY tsconfig*.json ./

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
