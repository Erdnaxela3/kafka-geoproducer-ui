FROM node:24-slim AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm --filter backend deploy --prod --legacy /out

FROM node:24-slim
WORKDIR /app
COPY --from=build /out ./
COPY --from=build /app/frontend/dist ./public
ENV NODE_ENV=production STATIC_DIR=/app/public PORT=4000
EXPOSE 4000
USER node
CMD ["node", "server.ts"]
