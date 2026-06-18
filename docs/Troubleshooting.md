# FameHub Troubleshooting & Diagnostics Guide

This document lists common issues, diagnosis commands, and quick fixes.

## Common Issues & Resolutions

### 1. Database Connection Refused (PostgreSQL Offline)
- **Symptom**: Server console logs `[Database] PostgreSQL connection refused. Enabling SQLite fallback.`
- **Reason**: The database container is not running, starting up, or is configured on a non-standard port.
- **Resolution**: Check the Postgres container logs:
  ```bash
  docker compose logs postgres
  ```
  Ensure `.env` matches the port and password.

### 2. Invalid or Expired CSRF Token
- **Symptom**: Mutation API requests fail with status code `403` and body `{"success": false, "message": "Invalid or missing CSRF token"}`
- **Reason**: The client is not sending the token in the `X-CSRF-Token` header, or the cookie expired/was deleted.
- **Resolution**: Ensure the frontend reads the `csrfToken` cookie value and appends it to headers under `x-csrf-token`.

### 3. Kafka Connection Errors
- **Symptom**: Server prints `Connection failed. Falling back to Mock local event bus...`
- **Reason**: Zookeeper/Kafka container starting sequence race condition.
- **Resolution**: Ensure the Kafka healthcheck passes. If Zookeeper goes offline, restart the compose stack:
  ```bash
  docker compose restart zookeeper kafka
  ```

### 4. Nginx Certificate Missing
- **Symptom**: Nginx container exits on start or logs `ssl_certificate file "/etc/nginx/ssl/server.crt" not found`
- **Reason**: Secure HTTPS is configured, but no certs are placed in `nginx/ssl/`.
- **Resolution**: Create self-signed development certificates:
  ```bash
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/server.key \
    -out nginx/ssl/server.crt \
    -subj "/C=US/CN=localhost"
  ```

## Viewing Logs
- Main logs are saved to `backend/logs/combined.log` and `backend/logs/error.log`.
- Access logs: `backend/logs/access.log`.
- Kafka audits: `backend/logs/kafka.log`.
- BigBlueButton connection details: `backend/logs/bbb.log`.
