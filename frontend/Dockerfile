# Stage 1: Build the frontend
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# The backend is accessed via Nginx reverse proxy at /api and /socket.io
# So the frontend just needs to connect to the same origin
ENV VITE_BACKEND_URL=""

RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:alpine

# Copy built assets to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
