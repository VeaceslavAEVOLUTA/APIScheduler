FROM node:20-alpine
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY package.json package.json
COPY apps/web/package.json apps/web/package.json

RUN npm install

COPY apps/web apps/web

RUN npm --workspace apps/web run build

EXPOSE 3000
CMD ["npm", "--workspace", "apps/web", "run", "start"]
