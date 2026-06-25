# FameHub Project Status: Completed Features & Production Roadmap

This document summarizes the current state of **FameHub** (Phase 2 Enterprise LMS & Live Classroom Platform) and outlines the step-by-step requirements and processes to transition the application from its current development state into a fully production-ready deployment.

---

## 📅 Project Status Overview

FameHub is structured as a decoupled Single Page Application (SPA) with a lightweight, dynamic **Vanilla JS Vite Frontend** and a robust **Node.js/Express Backend** supporting event-driven workflows, AI-assisted features, virtual classrooms via BigBlueButton, caching, telemetry, and containerized deployment manifests.

### System Architecture Topology

```
                      +-----------------------------------+
                      |           Vite Frontend           | <----+
                      |     (Vanilla JS SPA + Socket)     |     |
                      +-----------------------------------+     | API / WebSocket
                                        |                       |
                                        v                       v
                      +-------------------------------------------------+
                      |             Express.js REST Backend             |
                      +-------------------------------------------------+
                         |          |            |             |
       +-----------------+          |            |             +-----------------+
       v                            v            v                               v
+-------------+              +--------------+ +------------+              +---------------+
| SQLite/SQL  |              | Redis Cache  | |   Apache   |              | BigBlueButton |
| Persistence |              | (Temporary)  | |   Kafka    |              |   Simulator   |
+-------------+              +--------------+ +------------+              +---------------+
```

---

## 🛠️ Part 1: What Has Been Completed So Far

### 1. Unified Frontend SPA (`src/`)
- **Vanilla JavaScript Engine**: Dynamic page routing and DOM rendering without the overhead of heavy framework runtimes.
- **Role-Based Routing & Dashboards**:
  - **Admin**: Visualizes user statistics, active course lists, course/department builders, and real-time AI engine token telemetry.
  - **Teacher**: Supports course generation, assignment reviews, quiz setup, and real-time class starting.
  - **Student**: Lists enrolled courses, upcoming quizzes (with countdown timers), grading feedback, and personalized learning cards.
- **AI Companion UI Widget**: A floating interactive chat UI pinned to the student dashboard that connects to WebSocket streams for token-by-token text generation.
- **Toast Notifications**: Interactive alert manager showing system-wide notifications using CSS keyframe animations.
- **Premium Style Theme (`src/style.css`)**: Glassmorphism dashboard frames, curated Indigo/Emerald palette, skeleton loaders, and responsive CSS grids using Bootstrap 5.

### 2. Enterprise Backend (`backend/`)
- **Express.js API Layer**: Decoupled routes for authentication, courses, departments, live meetings, assignments, quizzes, and telemetry.
- **Advanced Middlewares**:
  - **JWT Verification & Token Rotation**: Role-based access validation via HTTP headers.
  - **CSRF Token Validation**: Secures routes against cross-site requests using double-submit cookies.
  - **Rate Limiter & HTTP Logging**: Prevents brute force attempts (`express-rate-limit`) and pipes request diagnostics via Winston (`httpLogger.js`).
  - **Security (Helmet) & Compression**: Adds HTTP security headers and gzips responses.
- **Sequelize Database Models**: Fully mapped tables for `User`, `Department`, `Course`, `Meeting`, `Attendance`, `Assignment`, `AuditLog`, and AI telemetry tables.
- **Real-Time WebSocket Handler**: Upgrades HTTP requests to manage streaming AI chunks, typing indicators, and system broadcast messages.

### 3. BigBlueButton Live Classroom Integration
- **Checksum Signatures**: Generates SHA-1 hash hashes to communicate with BigBlueButton APIs (`/create`, `/join`, `/end`, `/getMeetingInfo`, `/getRecordings`).
- **Built-in HTML Live Simulator**:
  - Provides a self-contained mock virtual room if no remote BBB server is configured.
  - Toggles audio/video streams, displays participant queues, and offers mock buttons to simulate students joining/leaving the session.
  - Generates realistic classroom cycle events.

### 4. Event-Driven Messaging (Apache Kafka)
- **Central Event Streaming**: Dispatches messages to Kafka topics like `live-class-events`, `attendance-events`, and `notification-events`.
- **Local Fallback Event Bus**: A built-in local event-emitter fallback that executes automatically when no Kafka server is present.
- **Automatic Attendance Tracker**:
  - Background loop scanning active meetings.
  - Logs student join/leave times, calculates duration, and auto-promotes student status to "Present" once configurable thresholds are reached.

### 5. Modular AI Engine Layer
- **Provider Wrapper (`backend/src/ai/providers/`)**:
  - Exposes unified interface primitives: `chat(messages, options)` and `embed(text)`.
  - Supports **OpenAI API**, **Google Gemini SDK**, **Ollama** (local models), and a default **Mock Sandbox mode** if API keys are missing.
- **Specialized AI Services**:
  - **ChatService**: Maintains history and streams tokens over WebSockets.
  - **QuizGenerator**: Parses document pages and builds structured multiple-choice, multi-select, and true/false questions.
  - **AssignmentEvaluator**: Grades submissions against criteria, scoring plagiarism probability and highlighting weak areas.
  - **RecommendationService**: Inspects scores, attendance rates, and quiz records to construct personalized practice paths.
  - **LectureSummarizer**: Reads classroom recordings to write Key Concept badges, Markdown notes, and revision questions.
  - **SemanticSearch**: Performs cosine similarity calculations across vector embeddings.

### 6. DevOps & Infrastructure Setup
- **Dockerization**: Complete multi-stage `Dockerfile` and `docker-compose.yml` defining services for `backend`, `frontend`, `kafka`, `zookeeper`, `redis`, and `db-migrations`.
- **Kubernetes Manifests (`kubernetes/`)**:
  - Deploys application layers inside separate namespaces with ConfigMaps, Persistent Volume Claims (PVC), NodePort Ingress rules, and infrastructure stateful sets.
- **Telemetry & Monitoring**:
  - Prometheus middleware scraping endpoint statistics (`/metrics`).
  - Grafana dashboard layout config (`monitoring/grafana-dashboard.json`) representing active requests, memory consumption, and error rates.
- **CI/CD Integration**: GitHub action workflows for validation building (`ci.yml`) and automated image deployment (`cd.yml`).

---

## 📈 Part 2: Requirements & Process to Move Forward

To transition FameHub from local development sandbox mock fallbacks into a live production system, follow this sequence of configurations and deployments:

### 1. Upgrade the Database Engine
Currently, the backend runs on **SQLite** (`database.sqlite`), which is a file-based database unsuitable for concurrent production operations.
- **Requirement**: A managed **PostgreSQL** or **MySQL** server (e.g., AWS RDS PostgreSQL).
- **Process**:
  1. Set up a PostgreSQL instance.
  2. Update the environment variables in `backend/.env`:
     ```ini
     DB_DIALECT=postgres
     DB_HOST=your-rds-endpoint.amazonaws.com
     DB_NAME=famehub_prod
     DB_USER=famehub_admin
     DB_PASS=secure_password_here
     DB_PORT=5432
     ```
  3. Ensure database migrations are run at startup (`npm run db:migrate` or let Sequelize auto-sync in `backend/config/database.js` depending on migration policy).

### 2. Connect to an Actual BigBlueButton Server
The project is running in Simulator Mode. To connect to an actual live classroom:
- **Requirement**: An active BigBlueButton server instance (or a third-party hosted BBB service) with API credentials.
- **Process**:
  1. Modify `backend/.env` to configure your BBB credentials and turn off Demo Mode:
     ```ini
     BBB_URL=https://your-bbb-domain.com/bigbluebutton/api
     BBB_SECRET=your_actual_shared_secret_here
     # Set to false to disable Simulator Mode and route to the actual BBB server
     BBB_DEMO_MODE=false
     ```
  2. Ensure the production BBB server can send Webhook callbacks back to the FameHub server if you plan to capture real attendance events via official webhooks (instead of simulated action loops).

### 3. Production Apache Kafka Setup
The current environment is configured with a single-node Kafka instance in Docker, and the backend falls back to an in-memory event bus when Kafka is unavailable.
- **Requirement**: A managed Kafka cluster (e.g., AWS MSK, Confluent Cloud, or a dedicated cluster).
- **Process**:
  1. provision Kafka brokers with TLS authentication.
  2. Configure connection settings in `backend/.env`:
     ```ini
     KAFKA_BROKERS=broker1.amazonaws.com:9092,broker2.amazonaws.com:9092
     KAFKA_CLIENT_ID=famehub-lms-prod
     KAFKA_GROUP_ID=lms-group-prod
     # Ensure fallback mode is disabled in production to enforce message durability
     KAFKA_FALLBACK=false
     ```
  3. Configure replication factors and partition counts for production topics (`live-class-events`, `attendance-events`, `notification-events`) to ensure fault tolerance.

### 4. Enable Production AI Engine Configurations
The AI services currently operate in Mock Mode if no API keys are provided. To activate real AI integrations:
- **Requirement**: API access keys for the chosen provider (OpenAI API key, Google Gemini API key, or an Ollama endpoint hosted on a GPU cluster).
- **Process**:
  1. Choose your primary provider (e.g., `gemini` or `openai`) and update variables:
     ```ini
     AI_PROVIDER=gemini  # or openai, ollama
     
     # If using Gemini:
     GEMINI_API_KEY=your_gemini_api_key_here
     
     # If using OpenAI:
     OPENAI_API_KEY=your_openai_api_key_here
     
     # If using Ollama (self-hosted):
     OLLAMA_HOST=http://your-gpu-server-ip:11434
     ```
  2. **Vector Store Integration**: For the Semantic Search feature, transition from the simple in-memory similarity comparison to a persistent vector database (e.g., **pgvector** inside PostgreSQL, **ChromaDB**, or **Pinecone**).

### 5. Production Redis Deployment
- **Requirement**: A cluster or managed instance of **Redis** (e.g., AWS ElastiCache Redis) to handle caching of meeting information and session states.
- **Process**:
  1. Configure Redis environment variables:
     ```ini
     REDIS_HOST=your-redis-endpoint.cache.amazonaws.com
     REDIS_PORT=6379
     REDIS_PASSWORD=secure_redis_auth_token
     ```

### 6. Production Security Hardening
- **SSL/TLS**: Enforce HTTPS for all web traffic and WSS for WebSocket connections.
- **Session & Cookie Security**: Ensure the CSRF cookie and JWT tokens use the `Secure`, `HttpOnly`, and `SameSite=Strict` attributes.
- **Environment Secrets Management**: Remove all raw passwords and API keys from local `.env` files. In production, load them securely via:
  - **AWS Secrets Manager / Systems Manager Parameter Store**
  - **Kubernetes Secrets** (injected as environment variables inside pod definitions)
  - **HashiCorp Vault**
- **CORS Config**: Lock down Cross-Origin Resource Sharing (CORS) in `backend/app.js` to only allow requests originating from your production frontend domain (rather than `*` or `localhost`).

### 7. Kubernetes / Cloud Deployment Process
To deploy using the manifests in the `kubernetes/` folder:
1. **Build and Tag Images**: Build production Docker images for the frontend and backend and push them to a container registry (e.g., AWS ECR, DockerHub):
   ```bash
   docker build -t your-registry/famehub-backend:latest ./backend
   docker build -t your-registry/famehub-frontend:latest .
   docker push your-registry/famehub-backend:latest
   docker push your-registry/famehub-frontend:latest
   ```
2. **Apply Configurations**: Update container image names inside `kubernetes/backend.yaml` and `kubernetes/frontend.yaml` to point to your registry.
3. **Deploy manifests to Cluster**:
   ```bash
   kubectl apply -f kubernetes/namespace.yaml
   kubectl apply -f kubernetes/configmap-secrets.yaml
   kubectl apply -f kubernetes/pv-pvc.yaml
   kubectl apply -f kubernetes/infrastructure.yaml  # Kafka, Zookeeper, Redis, PostgreSQL
   kubectl apply -f kubernetes/backend.yaml
   kubectl apply -f kubernetes/frontend.yaml
   kubectl apply -f kubernetes/ingress.yaml
   ```
4. **Ingress & DNS Routing**: Configure Ingress controllers (like NGINX Ingress) and provision SSL certificates using **cert-manager** (Let's Encrypt) to map production hostnames (e.g., `lms.famehub.com` and `api.famehub.com`) to the ingress endpoints.
