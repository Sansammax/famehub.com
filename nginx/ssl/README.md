# Nginx SSL Configuration Guide

To enable HTTPS in production, you must place your SSL certificate and private key in this directory:

- Certificate file: `nginx/ssl/server.crt`
- Private key file: `nginx/ssl/server.key`

## Generating Self-Signed Certificates for Development

For local testing, you can generate a self-signed certificate using OpenSSL:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/server.key \
  -out nginx/ssl/server.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/OU=IT/CN=localhost"
```

## Obtaining Free Certificates (Let's Encrypt)

For production, it is highly recommended to use Let's Encrypt:

1. Install Certbot on the host machine.
2. Generate certificates:
   ```bash
   sudo certbot certonly --standalone -d famehub.edu -d www.famehub.edu
   ```
3. Map or copy the certificate files:
   - Copy `/etc/letsencrypt/live/famehub.edu/fullchain.pem` to `nginx/ssl/server.crt`
   - Copy `/etc/letsencrypt/live/famehub.edu/privkey.pem` to `nginx/ssl/server.key`
4. Set up a cron job to automatically renew the certificates and restart the Nginx container:
   ```bash
   0 0 1 * * certbot renew --post-hook "docker compose restart nginx"
   ```
