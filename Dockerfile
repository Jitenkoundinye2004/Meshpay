# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Server Environment
FROM node:20-alpine AS runner
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist /app/backend/public

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "src/server.js"]
