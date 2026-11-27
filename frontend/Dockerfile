FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm test && npm run build

FROM nginx:1.29-alpine
ENV PORT=8080 \
    ENDORSEMENT_API_URL=http://endorsement-api:3000 \
    ROUTES_API_URL=http://routes-api:8080 \
    NGINX_ENVSUBST_FILTER="^(PORT|ENDORSEMENT_API_URL|ROUTES_API_URL)$"
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
