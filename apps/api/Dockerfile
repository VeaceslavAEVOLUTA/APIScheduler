FROM node:20-bookworm-slim
WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install

COPY apps/api apps/api
COPY packages/shared packages/shared

RUN npm --workspace apps/api run prisma:generate
RUN npm --workspace apps/api run build

EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
