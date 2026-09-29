# Multi-stage build for LLM Proxy Lambda function
# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/llm-proxy ./packages/llm-proxy
COPY packages/config ./packages/config
COPY tsconfig.base.json ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build LLM Proxy
RUN pnpm --filter @llm-proxy/app build

# Stage 2: Runtime
FROM node:24-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy built application from builder
COPY --from=builder /app/packages/llm-proxy/dist ./dist
COPY --from=builder /app/packages/llm-proxy/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 8080

# Start application
CMD ["node", "dist/index.js"]
