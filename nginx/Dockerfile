# ═══════════════════════════════════════════════════════════════════════════
#  Nginx Dockerfile — Multi-stage
#  Stage 1: Uses node:20-alpine to copy React build (from frontend)
#  Stage 2: nginx:alpine to serve static + proxy
# ═══════════════════════════════════════════════════════════════════════════

# ── Stage 1: Get the React production build ──────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app

# Copy frontend source
COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend .
RUN npm run build

# ── Stage 2: Nginx Runtime ────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom config
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy React build output to nginx html root
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# Copy self-signed certs (generated via openssl — see README.md)
# In CI/CD, mount real certs as a secret/volume instead
RUN apk add --no-cache openssl && mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -newkey rsa:2048 -days 30 \
      -keyout /etc/nginx/certs/waypoint.key \
      -out /etc/nginx/certs/waypoint.crt \
      -subj "/CN=localhost"

# Create directories nginx needs
RUN mkdir -p /var/www/certbot && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80
EXPOSE 443

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
