FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma.config.ts ./
COPY prisma ./prisma
RUN DATABASE_URL=postgresql://spots:synthetic@127.0.0.1:5432/spots npx prisma generate

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

COPY lib ./lib
COPY scripts ./scripts
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY check-users.js seed.js seed_place.js server.js ./

USER node

EXPOSE 3001

CMD ["node", "server.js"]
