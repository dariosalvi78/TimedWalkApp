FROM node:20-alpine

WORKDIR /app

# Install only runtime dependencies.
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code and default config.
COPY index.js ./
COPY team.json ./

# Create writable folder for test result text files.
RUN mkdir -p /app/test-results

ENV NODE_ENV=production
ENV PORT_NUMBER=3000
ENV LOG_LEVEL=info
ENV LOG_FILE=./server.log
ENV CONFIG_FILE=./team.json
ENV TEST_RESULTS_DIR=./test-results
ENV SERVER_CODE_PREFIX=00

EXPOSE 3000

# Persist physical test outputs across container restarts.
VOLUME ["/app/test-results"]

CMD ["node", "index.js"]
