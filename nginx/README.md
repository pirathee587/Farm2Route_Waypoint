# Nginx — SSL Certs & Setup Guide

## ⚠️ certs/ folder is git-ignored

The `certs/` folder contains **self-signed certificates for local development only**.  
Never commit real certificates to version control.

---

## 🔐 Step 1 — Generate Self-Signed Certificate (Local Dev)

Run this **one command** from the `nginx/` directory:

```bash
mkdir -p certs

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout certs/waypoint.key \
  -out certs/waypoint.crt \
  -subj "/C=LK/ST=WesternProvince/L=Colombo/O=WaypointHackathon/OU=Dev/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:waypoint.local,IP:127.0.0.1"
```

This generates:
| File | Purpose |
|------|---------|
| `certs/waypoint.key` | Private key (keep secret) |
| `certs/waypoint.crt` | Self-signed certificate (365 days) |

---

## 🌐 Step 2 — Trust the cert in your browser (optional)

### Chrome / Edge
1. Go to `chrome://settings/certificates`
2. Import `certs/waypoint.crt` under **Trusted Root Certification Authorities**

### Firefox
1. Go to `about:preferences#privacy` → **View Certificates**
2. Import `certs/waypoint.crt` → tick **Trust for websites**

### macOS Keychain
```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain nginx/certs/waypoint.crt
```

---

## 🐳 Step 3 — Start the stack

```bash
# From repo root
docker compose up --build
```

The nginx container will:
- Serve the React frontend at `https://localhost`
- Redirect all `http://localhost` → `https://localhost`
- Proxy `/api/**` → `api-gateway:8080`
- Handle WebSocket upgrades at `/api/notify/ws`

---

## 🔄 Production (Let's Encrypt)

For a real domain, replace the self-signed certs with Certbot:

```bash
# Install certbot and obtain cert
certbot certonly --standalone -d yourdomain.com

# Update docker-compose.yml to mount:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem → /etc/nginx/certs/waypoint.crt
# /etc/letsencrypt/live/yourdomain.com/privkey.pem   → /etc/nginx/certs/waypoint.key
```

---

## 📋 Nginx Config Overview

| Location | Target | Notes |
|----------|--------|-------|
| `http://` (port 80) | → `https://` redirect | 301 permanent |
| `/` | React build (`/usr/share/nginx/html`) | SPA fallback to `index.html` |
| `/api/auth/` | `api-gateway:8080` | Rate-limited: 10r/min |
| `/api/notify/ws` | `api-gateway:8080` | WebSocket upgrade, 1h timeout |
| `/api/` | `api-gateway:8080` | Rate-limited: 30r/s |
| `/nginx-health` | Internal health check | Returns `200 nginx ok` |

---

## 🛡️ SSL Settings

```
Protocols : TLSv1.2, TLSv1.3  (TLS 1.0 & 1.1 disabled)
Ciphers   : HIGH:!aNULL:!MD5:!RC4:!3DES
Session   : Shared cache 10m, tickets off
```
