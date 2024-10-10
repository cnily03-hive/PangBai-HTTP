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

FROM base AS fetch
RUN apt update && apt install -y curl
RUN curl https://gist.githubusercontent.com/Cnily03/4d4a8a1f2ba63328a9543c82b73a677c/raw/dfbc1f5ca355858fd19e28d6078e62f102679cd5/mvval.sh -o /usr/local/bin/mvval.sh

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

COPY --from=fetch /usr/local/bin/mvval.sh /usr/local/bin/mvval.sh
RUN chmod +x /usr/local/bin/mvval.sh

# Use mvval.sh to switch user
USER root
ENV NODE_ENV=production
ENTRYPOINT [ "/usr/local/bin/mvval.sh", "--type=env", "--name=ICQ_FLAG:FLAG", "--user=ctf", "--", "/usr/local/bin/docker-entrypoint.sh" ]
CMD [ "bun", "start" ]

EXPOSE 3000