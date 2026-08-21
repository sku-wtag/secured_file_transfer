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
COPY client/tsconfig.json client/tsconfig.app.json client/tsconfig.node.json client/tsconfig.worker.json client/
COPY client/vite.config.ts client/index.html client/
COPY client/public client/public
COPY client/src client/src
RUN yarn workspace shared build && yarn workspace client build

FROM nginx:1.29-alpine AS runtime
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
