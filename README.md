# PangBai-HTTP

This is the challenge for NewStarCTF 2024 in the category of Web, Week 1.

This challenge requires participants to complete several levels related to HTTP.

The challenge doesn't provide source code to participants.

## Deployment

> [!NOTE]
> If the development is at ichunqiu platform, please modify [docker-compose.yml](docker-compose.yml) to change `Dockerfile` into `Dockerfile.icq` and the environment variable `FLAG` to `ICQ_FLAG`.

Docker is provided. You can run the following command to start the environment quickly:

```bash
docker compose build # Build the image
docker compose up -d # Start the container
```

For manual installation, you can follow the steps below.

Install the dependencies:

```bash
pnpm install
```

Build the frontend:

```bash
pnpm build
```

Start the server:

```bash
bun start
```

> [!NOTE]
> The `bun` runtime is required. For more information, please refer to the [bun.sh](https://bun.sh).

## License

Copyright (c) Cnily03. All rights reserved.

Licensed under the [MIT](LICENSE) License.
