# ====================================================================
# Dockerfile: Dashboard Costes Medios & Compras (Telematel ERP Integration)
# ====================================================================

# --- Stage 1: Build Frontend React / Vite Bundle ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy full application source code
COPY . .

# Build production bundle with Vite
RUN npm run build

# --- Stage 2: Production Server Runtime ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV TLM_HOST_NAME=dataserver
ENV TLM_HOST_IP=192.168.1.3

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled frontend dist from Stage 1
COPY --from=builder /app/dist ./dist

# Copy backend server code and scripts
COPY server ./server
COPY datos_costes_actualizados.json ./
COPY datos_pedidos_pendientes.json ./
COPY datos_costes_calidad.json ./

EXPOSE 3000

CMD ["node", "server/dbConnectorServer.js"]
