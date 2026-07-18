FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/data ./data
COPY --from=build /app/parts ./parts

EXPOSE 3000

CMD ["npm", "start"]
