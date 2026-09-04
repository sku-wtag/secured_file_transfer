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
RUN apk add --no-cache ca-certificates
ENV NGINX_ENVSUBST_FILTER="^(API_PROXY_TARGET|API_PROXY_AUTHORITY|API_PROXY_SSL_NAME|NGINX_PORT|NGINX_RESOLVER)\$"
COPY client/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY client/docker-entrypoint.d/15-api-proxy-target.envsh /docker-entrypoint.d/15-api-proxy-target.envsh
RUN chmod +x /docker-entrypoint.d/15-api-proxy-target.envsh
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
