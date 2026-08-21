FROM node:24-bookworm-slim AS manifests
WORKDIR /app
COPY package.json yarn.lock ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/

FROM manifests AS deps
RUN yarn install --frozen-lockfile

FROM deps AS build
COPY shared/tsconfig.json shared/
COPY shared/src shared/src
COPY server/tsconfig.json server/tsconfig.tools.json server/drizzle.config.ts server/
COPY server/src server/src
RUN yarn workspace shared build && yarn workspace server build

FROM manifests AS prod-deps
RUN yarn install --frozen-lockfile --production && yarn cache clean

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV BLOB_ROOT=/data/blobs
WORKDIR /app
COPY --from=prod-deps /app ./
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/server/dist server/dist
RUN mkdir -p "$BLOB_ROOT" && chown -R node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "server/dist/index.js"]
