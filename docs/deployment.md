# FameHub Production Setup & Deployment Guide

This document describes how to deploy FameHub using Docker Compose in a production environment.

## Prerequisites
Ensure the host server has the following installed:
- Docker Engine >= 24.0
- Docker Compose v2
- Domain name pointed to the host IP (e.g. `famehub.edu`)

## Quick Deploy Steps

1. Clone this repository onto the production server:
   ```bash
   git clone https://github.com/sansmax/famehub.com.git /opt/famehub
   cd /opt/famehub
   ```

2. Copy the template configuration file:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` and customize your production variables. Specifically, ensure the following are updated:
   - `JWT_SECRET` (generate a long random key)
   - `DATABASE_URL` (uses the built-in PostgreSQL container credentials by default)
   - `BBB_URL` and `BBB_SECRET` (specify details from your BigBlueButton service provider)

4. Generate self-signed SSL certificates for initial deployment, or replace them with your domain certificates:
   ```bash
   mkdir -p nginx/ssl
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout nginx/ssl/server.key \
     -out nginx/ssl/server.crt \
     -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
   ```

5. Build and run the entire LMS stack:
   ```bash
   docker compose up -d --build
   ```

6. Verify that all 7 containers are healthy and running:
   ```bash
   docker compose ps
   ```

## Logs and Volumes
The stack mounts volumes on the host to persist data:
- **PostgreSQL Database**: Persisted inside Docker volume `postgres_data`
- **Redis Cache**: Persisted inside Docker volume `redis_data`
- **Static Assets/Uploads**: Mounted to host folder `uploads/`
- **System Logs**: Emitted to `logs/` folder and accessible inside backend containers
