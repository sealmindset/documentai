FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p /tmp/portal-uploads

USER node
EXPOSE 3000

CMD ["node", "server.js"]
