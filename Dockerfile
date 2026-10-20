# Leora Events — production image.
#
# @nahu/admin-kit is a sibling folder (`file:../admin-kit`), so build from the PARENT folder:
#   cd .. && docker build -f leoraWeddingNew/Dockerfile -t leora-events .
# Dockerfile.dockerignore (next to this file) limits the context to the two projects.
#
# Run (see docker-compose.yml for a full example):
#   docker run --env-file leoraWeddingNew/.env -p 3000:3000 -v leora-files:/data leora-events
# Migrations, once per release:
#   docker run --rm --env-file leoraWeddingNew/.env leora-events npm run db:migrate

FROM node:22-alpine AS build
WORKDIR /src
COPY admin-kit ./admin-kit
COPY leoraWeddingNew ./leoraWeddingNew
RUN cd admin-kit && npm ci
RUN cd leoraWeddingNew && npm ci && npx vite build

FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    BODY_SIZE_LIMIT=12M \
    FILES_DIR=/data/files
WORKDIR /app/leoraWeddingNew
# admin-kit is symlinked from node_modules, so it keeps its relative place.
COPY --from=build /src/admin-kit /app/admin-kit
COPY --from=build /src/leoraWeddingNew/build ./build
COPY --from=build /src/leoraWeddingNew/node_modules ./node_modules
COPY --from=build /src/leoraWeddingNew/package.json /src/leoraWeddingNew/drizzle.config.ts ./
COPY --from=build /src/leoraWeddingNew/drizzle ./drizzle
COPY --from=build /src/leoraWeddingNew/database ./database
COPY --from=build /src/leoraWeddingNew/scripts ./scripts
COPY --from=build /src/leoraWeddingNew/static ./static
RUN mkdir -p /data/files && chown -R node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/robots.txt >/dev/null || exit 1
CMD ["node", "build"]
