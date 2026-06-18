FROM node:20-alpine

# Set node environment to production
ENV NODE_ENV=production

# Create app directory
WORKDIR /usr/src/app

# Copy dependency configs
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy app source code
COPY . .

# Setup uploads and logs folder structures and fix permissions
RUN mkdir -p logs uploads/avatars uploads/course-covers uploads/assignments \
    && chown -R node:node /usr/src/app

# Use non-root user
USER node

# Expose backend port
EXPOSE 5000

# Health check utilizing Node 20 native fetch
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:5000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Run production command
CMD ["node", "server.js"]
