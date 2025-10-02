# Build stage for client
FROM node:18-alpine as client-builder

WORKDIR /app/client

# Copy package files
COPY client/package*.json ./

# Clean install with platform-specific binaries and clear cache
RUN rm -rf node_modules package-lock.json && \
    npm cache clean --force && \
    npm install

# Copy client source
COPY client/ ./

# Build the client
RUN npm run build

# Production stage
FROM node:18-alpine

# Add curl for healthchecks and create non-root user
RUN apk --no-cache add curl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy and install server dependencies
COPY server/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy server source code
COPY server/ ./

# Copy built client files from build stage
COPY --from=client-builder /app/client/dist ./client/dist

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Start server
CMD ["node", "server.js"]
