FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY bin ./bin
COPY src ./src

RUN mkdir -p /app/config /app/data /app/keys && chown -R node:node /app

USER node

# Runtime mounts:
# - /app/config (policy, signatures, key store, integrity manifest)
# - /app/data   (nonce/rate/audit/policy state)
# - /app/keys   (optional signer keys, read-only recommended)
VOLUME ["/app/config", "/app/data", "/app/keys"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD ["node", "bin/lbe.js", "health", "--json", "true"]

ENTRYPOINT ["node", "bin/lbe.js"]
CMD ["help"]
