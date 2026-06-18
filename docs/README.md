# FameHub Phase 2 Enterprise Architecture Documentation

Welcome to the **FameHub Phase 2 Enterprise Architecture** documentation. This directory contains detailed guides, API schemas, event flows, and system diagrams for the integrated Learning Management System (LMS).

## 📂 Documentation Manifest

1. **[System Diagrams & Workflows](file:///e:/famehub.com/docs/diagrams.md)**: Contains the visual System Architecture and Mermaid Sequence Diagrams for the core flows (Join Meeting, Attendance marking, Kafka Events, and WebSocket notifications).
2. **[REST API Specifications](file:///e:/famehub.com/docs/api.md)**: Details the request/response payloads for the authentication, live BigBlueButton meetings, and analytics endpoints.
3. **[Kafka Architecture Guide](file:///e:/famehub.com/docs/kafka_architecture.md)**: Explains the event-driven publish/subscribe structure, topics list, and messaging payloads.
4. **[BigBlueButton Integration Guide](file:///e:/famehub.com/docs/bbb_integration.md)**: Details signature checksum calculations, API parameters, and the built-in HTML live room simulator.
5. **[Environment Configuration Guide](file:///e:/famehub.com/docs/environment_variables.md)**: Documents variable keys, descriptions, default values, and setup configurations.
6. **[Deployment & Setup Guide](file:///e:/famehub.com/docs/deployment.md)**: A step-by-step developer setup and production deployment checklist.

---

## 🛠️ Architecture Stack Overview

```
                      +-------------------+
                      |   Vite Frontend   | <---+
                      | (Vanilla JS SPA)  |     | API & WebSockets
                      +-------------------+     |
                                |               |
                                v               v
                      +-----------------------------------+
                      |      Node.js/Express Backend      |
                      +-----------------------------------+
                         |       |       |       |
      +------------------+       |       |       +------------------+
      v                          v       v                          v
+-------------+       +--------------+ +-----------+        +---------------+
| PostgreSQL  |       | Redis Cache  | |  Apache   |        | BigBlueButton |
| Persistence |       |  (Meeting)   | |   Kafka   |        |   Classroom   |
+-------------+       +--------------+ +-----------+        +---------------+
```

FameHub is structured as a decoupled SPA:
- **Frontend**: Serves instant static assets compiled via Vite, connecting to APIs and WebSockets.
- **Backend**: An Express.js microservice architecture providing REST routes, authorization middleware, real-time message consumer listeners, and a background scanner loop.
- **Persistence & Caching**: PostgreSQL handles user records, meeting configurations, and attendance logs. Redis speeds up meeting information loads and limits remote API load.
- **Kafka Pub-Sub**: Acts as the central event ledger. When events occur (User login, course creation, attendance markings, student join/leaves), events are dispatched to Kafka topics. Independent consumers process messages asynchronously, creating alerts and writing analytics reports.
- **Conferencing**: Integrates natively with BigBlueButton APIs utilizing secure SHA-1 checksum signing.
