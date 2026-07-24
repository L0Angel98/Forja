FROM node:22-alpine
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/ingest ./apps/ingest
RUN pnpm install --frozen-lockfile
WORKDIR /repo/apps/ingest
USER node
ENV NODE_ENV=production
CMD ["pnpm", "exec", "tsx", "src/main.ts"]
