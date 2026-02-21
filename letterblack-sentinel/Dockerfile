FROM node:20-alpine

# Build args for version tracking
ARG BUILD_VERSION=0.2.0
ARG BUILD_DATE
ARG BUILD_COMMIT

LABEL org.opencontainers.image.title="LetterBlack Sentinel" \
      org.opencontainers.image.version="${BUILD_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${BUILD_COMMIT}" \
      org.opencontainers.image.vendor="LetterBlack"

WORKDIR /app
ENV NODE_ENV=production
ENV SENTINEL_VERSION=${BUILD_VERSION}

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY . .

# Create required directories and set permissions
RUN mkdir -p /app/config /app/data /app/keys && \
    chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -q -O- http://localhost:3000/health || exit 1

CMD ["node", "api-server.js"]
