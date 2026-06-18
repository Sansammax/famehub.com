# FameHub LMS System Architecture

This document outlines the high-level architecture and component mapping for FameHub.

## System Topology Diagram

The diagram below shows how different components interact in the production-ready FameHub deployment:

```
                  +-----------------------------------+
                  |        Client Browser             |
                  +-----------------+-----------------+
                                    |
                                    | HTTPS / WSS
                                    v
                  +-----------------+-----------------+
                  |         NGINX Reverse Proxy       |
                  +--------+-----------------+--------+
                           |                 |
                  /api     |                 |  / (Static files)
                           v                 v
            +--------------+----+     +------+------------+
            |  Backend Service  |     |  Frontend Service |
            +---+----+-----+----+     +-------------------+
                |    |     |
      Database  |    |     | Messaging
      Queries   |    |     | Events
                v    |     +-------------------------+
    +-----------+-+  |                               |
    | PostgreSQL  |  | Redis Cache                   v
    +-------------+  v                        +------+-------+
                  +--+---+                    | Apache Kafka |
                  |Redis |                    +------+-------+
                  +------+                           |
                                                     v
                                              +------+-------+
                                              | KafkaConsumer|
                                              +--------------+
```

## Component Breakdown

### 1. Frontend Service
A static single-page application (SPA) built using Vanilla JavaScript, HTML5, and Bootstrap 5, compiled using Vite. It connects to the Nginx reverse proxy to fetch static assets and communicate with the backend.

### 2. Backend Service
An Express.js Node application exposing JSON API endpoints and a WebSocket server upgrade path (`/sockets`). 
Key sub-modules:
- **controllers/**: Business logic layer for Authentication, Meetings, Users, Courses, Assignments, and Quizzes.
- **middleware/**: Security controls (Helmet, rateLimit, CSRF, input validation, compression, prom-client metrics).
- **services/**: Kafka integration handlers, BigBlueButton signature services, Attendance tracking, and real-time Notification queues.
- **sockets/**: WebSocket connection lifecycle management and dynamic dashboard update ticks.
- **models/**: Sequelize-based ORM mapping for PostgreSQL schemas.

### 3. Zookeeper & Apache Kafka
Used for stream processing and pub/sub messaging. Topics include:
- `user-events` (Signups, logins)
- `live-class-events` (Started classes, student joins, student leaves)
- `attendance-events` (Marks recorded)
- `recording-events` (Simulated classroom recordings published)

### 4. Redis Cache Server
Utilized by controllers for storing low-latency dashboard calculations and course directory details with short TTLs. Automatically falls back to local memory caches if Redis is disconnected.

### 5. PostgreSQL Database
The source-of-truth relational storage. Automatically falls back to a local SQLite database file in development if PostgreSQL is unavailable.
