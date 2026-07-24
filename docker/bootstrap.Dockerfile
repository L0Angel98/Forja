FROM node:22-alpine

RUN corepack enable

WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tsconfig.base.json ./
COPY packages ./packages

RUN pnpm install --frozen-lockfile

WORKDIR /repo/packages/db
USER node

CMD ["sh", "-c", "pnpm db:migrate && if [ \"$RUN_SEED\" = \"true\" ]; then pnpm seed; fi"]
