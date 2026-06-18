# Environment Variables Configuration Guide

The FameHub backend server requires several environment variables to run. These should be defined in a `.env` file inside the `backend/` directory.

An example template is available at `backend/.env.example` (or `backend/.env`).

---

## 📋 Configuration Reference

| Key | Description | Default | Environment |
| :--- | :--- | :--- | :--- |
| `PORT` | Listening port for the backend server | `5000` | Local / Dev / Prod |
| `NODE_ENV` | Mode of operation (`development` or `production`) | `development` | Dev / Prod |
| `JWT_SECRET` | Secret key used to sign and verify JWT tokens | `famehub-enterprise-secret-key-2026-xyz` | **Rotate in Prod** |
| `JWT_EXPIRES_IN` | Validity duration of issued tokens | `7d` | Dev / Prod |
| `DATABASE_URL` | PostgreSQL connection string (`postgres://...`) | *None* | Production |
| `SQLITE_DB_PATH` | Path to fallback SQLite file if PG fails | `./database.sqlite` | Development |
| `REDIS_URL` | Redis URL for cached meeting queries | `redis://localhost:6379` | Dev / Prod |
| `KAFKA_CLIENT_ID`| Identifier client string in Kafka logs | `famehub-lms` | Dev / Prod |
| `KAFKA_BROKERS` | CSV list of Kafka broker endpoints | `localhost:9092` | Dev / Prod |
| `BBB_URL` | API endpoint for BigBlueButton | *Official Demo API* | Dev / Prod |
| `BBB_SECRET` | API checksum secret for BigBlueButton | *Official Demo Secret* | Dev / Prod |
| `ATTENDANCE_THRESHOLD_SECONDS` | Duration a user must stay to be marked 'Present' | `60` | Dev / Prod |

---

## ⚙️ Fallback Mechanism Details

To facilitate immediate local development, services incorporate a fallback flow:
1. **Database**: If `DATABASE_URL` is omitted or PostgreSQL fails to connect, the server automatically syncs data to a local SQLite database at `backend/database.sqlite`.
2. **Cache**: If Redis is offline at `REDIS_URL`, the server defaults to an in-memory TTL caching Map.
3. **Kafka Events**: If `KAFKA_BROKERS` are unreachable or unset, the system fires events locally using a mock Node `EventEmitter` instance, letting consumers proceed.
4. **BigBlueButton**: If a local or remote BBB instance is unavailable, the backend serves an interactive, mock-rendered classroom window to test user join/leave flows.
