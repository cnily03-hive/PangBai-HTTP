FROM node:20.11.0-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN pnpm config set registry https://registry.npmjs.org/

RUN mkdir -p /app/
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
ENV NODE_ENV=production
RUN NODE_OPTIONS="--max_old_space_size=2048" pnpm build

FROM oven/bun:1.1.20-slim

ENV FLAG="flag{test_flag}"

RUN useradd -m ctf

RUN mkdir -p /app
COPY . /app
WORKDIR /app

RUN mkdir -p /app/public
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/public/dist /app/public/dist
RUN rm -rf public-src content.js webpack.config.js pnpm-lock.yaml package-lock.json

# Use mvval.sh to switch user
USER ctf
ENV NODE_ENV=production
CMD [ "bun", "start" ]

EXPOSE 3000