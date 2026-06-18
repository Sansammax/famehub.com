# AI Local & Production Deployment

FameHub's modular structure allows developers to run services locally (using Docker Compose or local executables) and scale them in production environments.

## 1. Local Development Setup

### Running with Mock Fallbacks (Fastest)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Configure `.env` variables:
   ```text
   PORT=5000
   AI_PROVIDER=mock
   ```
3. Boot the application:
   ```bash
   npm run dev
   ```

### Running with Google Gemini
1. Acquire an API key from Google AI Studio.
2. Edit `backend/.env`:
   ```text
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your_key_here
   ```
3. Run the development server.

### Running with Local Ollama
1. Download and install Ollama from [ollama.com](https://ollama.com).
2. Download your preferred small model:
   ```bash
   ollama pull llama3
   ```
3. Verify Ollama is running on port `11434`:
   ```bash
   curl http://localhost:11434
   ```
4. Set active provider in `backend/.env`:
   ```text
   AI_PROVIDER=ollama
   OLLAMA_HOST=http://localhost:11434
   OLLAMA_MODEL=llama3
   ```

---

## 2. Production Docker Deployment

FameHub compiles into standard container images. The global `docker-compose.yml` mounts: Zookeeper, Kafka broker, Redis, Postgres DB, BBB mockup, and the Node app.

To boot the entire enterprise stack with production AI routing:
```bash
docker compose up -d --build
```
Ensure all API keys are populated inside the main root `.env` file before executing compose commands.
