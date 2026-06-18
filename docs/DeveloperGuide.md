# FameHub Local Developer Guide

This guide describes how to run and debug FameHub locally on a developer workstation.

## Prerequisites
- Node.js >= 20.0
- SQLite3 (installed natively or via npm fallback)
- Optional: Local PostgreSQL, Redis, or Kafka instances (mock fallbacks are enabled automatically if these services are offline).

## Initial Setup

1. Install root frontend dependencies:
   ```bash
   npm install
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Setup environment variables:
   ```bash
   copy .env.example .env
   ```
   *In development, `NODE_ENV=development` enables SQLite fallback automatically (`database.sqlite`) and logs JSON statements in readable terminal coloring.*

## Running the Application

### 1. Run in Development Mode (with hot-reload)
Open two terminal windows:

**Terminal 1: Frontend Dev Server**
```bash
# Run from the root directory
npm run dev
```
*Frontend hot-reloads at http://localhost:5173/*

**Terminal 2: Backend Node Server**
```bash
# Run from the backend directory
npm run dev
```
*Backend API boots at http://localhost:5000/*

### 2. Running Unit & Integration Tests
We use Jest for unit testing. To execute backend tests:
```bash
cd backend
npm test
```

## Fallbacks for Offline Services
To simplify development:
- **No PostgreSQL?** The server logs warning and starts `database.sqlite` automatically.
- **No Redis?** The server caches items in local memory with expiring keys.
- **No Kafka?** The server utilizes Node's `EventEmitter` to process messages internally.
- **No BBB Server?** The BigBlueButton Service launches an HTML class simulator in the browser so you can trigger student joins and leaves and test the attendance/caching flows out-of-the-box.
