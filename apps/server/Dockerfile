FROM node:22-alpine
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/server ./apps/server
RUN pnpm install --frozen-lockfile
WORKDIR /repo/apps/server
USER node
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "exec", "tsx", "src/main.ts"]
