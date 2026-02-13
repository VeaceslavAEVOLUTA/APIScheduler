FROM node:20-alpine
WORKDIR /app

COPY package.json package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install

COPY apps/api apps/api
COPY packages/shared packages/shared
COPY .env.example .env

RUN npm --workspace apps/api run prisma:generate
RUN npm --workspace apps/api run build

EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
