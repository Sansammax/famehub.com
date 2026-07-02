# 📋 FameHub Production Checklist: Tasks from Your Side

This checklist outlines the configuration, provisioning, and deployment tasks required on your side to transition **FameHub** from the local development sandbox into a secure, production-ready enterprise LMS.

---

## 🗄️ 1. Database Upgrade & Setup
By default, the backend falls back to SQLite (`database.sqlite`). For production concurrency, you need to transition to a managed PostgreSQL database.

- [ ] **Provision a PostgreSQL Instance:** Set up a PostgreSQL instance (e.g., AWS RDS, Supabase, or self-hosted).
- [ ] **Configure the Backend Environment Variables:** Update `backend/.env` with your production connection details:
  ```ini
  DB_DIALECT=postgres
  DATABASE_URL=postgres://<user>:<password>@<rds-endpoint>:<port>/<dbname>
  ```
- [ ] **Run Migrations:** Initialize the production schema:
  ```bash
  npm run db:migrate
  ```

---

## 🎥 2. BigBlueButton (BBB) Integration
The project connects directly to the official BigBlueButton API.

- [ ] **Verify BBB Credentials:** Check `backend/.env` to ensure the API URL and secret are correct:
  ```ini
  BBB_URL=https://app.bbbserver.com/bbb-integration-v2/60a53a74-f9df-496a-9ae1-ca3079f26a7c/api
  BBB_SECRET=118c788f-d02e-444a-bbbe-055235f0100b
  ```

---

## ✉️ 3. Apache Kafka Message Bus
The backend currently runs on an in-memory event bus fallback if Kafka is missing. For high availability:

- [ ] **Provision a Kafka Cluster:** Deploy a Kafka cluster (e.g., AWS MSK, Confluent Cloud, or a containerized cluster in Kubernetes).
- [ ] **Disable local Fallback:** Enforce Kafka durability in production by updating `backend/.env`:
  ```ini
  KAFKA_BROKERS=broker1:9092,broker2:9092
  KAFKA_CLIENT_ID=famehub-lms-prod
  KAFKA_FALLBACK=false
  ```
- [ ] **Define Topics & Partitioning:** Ensure topics are created with appropriate partitions and replication factors:
  - `live-class-events`
  - `attendance-events`
  - `notification-events`

---

## 🤖 4. AI Engine & Vector Store Activation
AI services currently run in Mock Mode. To enable Gemini, OpenAI, or Ollama services:

- [ ] **Procure API Keys / Host Ollama:**
  - Get a Google Gemini API Key.
  - Get an OpenAI API Key.
  - Or host a self-hosted Ollama server on a GPU instance (e.g., `http://your-gpu-server-ip:11434`).
- [ ] **Update AI Configuration:** Update `backend/.env` with the chosen provider:
  ```ini
  AI_PROVIDER=gemini  # or 'openai' / 'ollama'
  GEMINI_API_KEY=your_gemini_api_key_here
  # OR
  # OPENAI_API_KEY=your_openai_api_key_here
  # OLLAMA_HOST=http://your-gpu-server-ip:11434
  ```
- [ ] **Deploy Vector Database:** For Semantic Search features, set up a vector storage solution (e.g., enable the `pgvector` extension on your PostgreSQL database, or provision a standalone ChromaDB/Pinecone instance).

---

## ⚡ 5. Redis Caching
For high-performance session and classroom state caching:

- [ ] **Provision a Redis Instance:** Set up Redis (e.g., AWS ElastiCache, Redis Labs, or self-hosted).
- [ ] **Update Caching Environment Variables:** Update `backend/.env`:
  ```ini
  REDIS_URL=redis://:<password>@<redis-endpoint>:<port>
  ```

---

## 🔒 6. Production Security & Hardening
Before launching the application publicly, implement these security measures:

- [ ] **Setup SSL/TLS Certificates:** Install SSL/TLS certificates (e.g., via Let's Encrypt / cert-manager) for HTTPS (`https://`) and WebSocket Secure (`wss://`) traffic.
- [ ] **Secure Cookies & Sessions:** Modify production settings to ensure `JWT` and `CSRF` cookies use:
  - `HttpOnly`
  - `Secure=true` (forces HTTPS)
  - `SameSite=Strict`
- [ ] **CORS Restriction:** Restrict allowed CORS origins in `backend/app.js` to only allow your official production frontend domain.
- [ ] **Move Secrets to a Vault:** Do not store raw API keys and passwords in plain `.env` files in production. Inject them securely via:
  - Kubernetes Secrets
  - AWS Secrets Manager / Parameter Store
  - HashiCorp Vault

---

## 🚀 7. Containerization & Kubernetes Deployment
To deploy using the files in the `kubernetes/` folder:

- [ ] **Build Production Docker Images:**
  ```bash
  # Build backend
  docker build -t your-registry/famehub-backend:latest ./backend
  # Build frontend
  docker build -t your-registry/famehub-frontend:latest .
  ```
- [ ] **Push Images to Container Registry:** Push images to your registry (e.g., AWS ECR, DockerHub, or GitHub Packages):
  ```bash
  docker push your-registry/famehub-backend:latest
  docker push your-registry/famehub-frontend:latest
  ```
- [ ] **Configure and Apply Kubernetes Manifests:**
  1. Update container image sources in `kubernetes/backend.yaml` and `kubernetes/frontend.yaml`.
  2. Load environment variables into `kubernetes/configmap-secrets.yaml`.
  3. Deploy using `kubectl`:
     ```bash
     kubectl apply -f kubernetes/namespace.yaml
     kubectl apply -f kubernetes/configmap-secrets.yaml
     kubectl apply -f kubernetes/pv-pvc.yaml
     kubectl apply -f kubernetes/infrastructure.yaml
     kubectl apply -f kubernetes/backend.yaml
     kubectl apply -f kubernetes/frontend.yaml
     kubectl apply -f kubernetes/ingress.yaml
     ```
- [ ] **Configure DNS & Ingress Routing:** Map your custom domains (e.g., `lms.yourdomain.com`) to the Kubernetes Load Balancer external IP.
