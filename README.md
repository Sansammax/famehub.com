# FameHub - Phase 2 Enterprise LMS & Live Classroom Platform

Welcome to **FameHub** (also referenced as **Smart Live LMS**). 

This repository has been upgraded to **Phase 2 Enterprise Architecture**, transforming a Vanilla JavaScript Vite SPA into a scalable event-driven Learning Management System (LMS) integrated with **BigBlueButton** for virtual classrooms and **Apache Kafka** as the event streaming platform.

---

## 🚀 Key Features

* **Authentication**: Token-based security using JSON Web Tokens (JWT) and role-based access control (RBAC) (Admin, Teacher, Student).
* **Virtual Classrooms**: Complete integration with BigBlueButton APIs featuring secure SHA-1 signature checksum calculations.
* **Event-Driven Messaging**: Asynchronous event publishing to Apache Kafka across topics like `live-class-events`, `attendance-events`, and `notification-events` with a resilient in-memory local event bus fallback.
* **Automatic Attendance Service**: Watches active classrooms, logs join/leave timestamps, monitors duration, and auto-promotes student status to "Present" when configurable thresholds are reached.
* **Real-time Live Dashboard**: Displays metrics (online students, active meetings, participant count) updating instantly over WebSockets.
* **Real-time Toast Notifications**: Emits system notification alerts over WebSocket connections, appearing as toast alerts in the browser.
* **Caching Layer**: Utilizes Redis for caching frequently read meeting configurations with automatic in-memory cache fallback.
* **Audit Logs**: Generates console audit trails documenting admin register, login, meeting creation, and attendance marks.

---

## 📂 Architecture Map

```text
famehub.com/
├── backend/                  # Node.js/Express.js Backend Server
│   ├── config/               # database, kafka, jwt, and bbb configs
│   ├── controllers/          # auth, live, and analytics controllers
│   ├── routes/               # Express API routers
│   ├── middleware/           # security rate-limit, jwt verify, error handlers
│   ├── services/             # Kafka producers/consumers, Attendance, BBB, Notifications
│   ├── models/               # Sequelize model classes
│   ├── sockets/              # WebSocket upgrade handlers and tick loops
│   ├── utils/                # logger and general helper utilities
│   ├── server.js             # Server startup entrypoint
│   └── app.js                # Express app setup
├── docs/                     # Visual diagrams and guides
│   ├── README.md             # Documentation overview
│   ├── api.md                # REST API endpoints specs
│   ├── bbb_integration.md    # BigBlueButton signature & integration guide
│   ├── kafka_architecture.md # Event-driven topics & schemas mapping
│   ├── environment_variables.md # Key configuration variables
│   ├── deployment.md         # Dev and docker compose execution guide
│   └── diagrams.md           # Architecture & Sequence charts (Mermaid)
├── src/                      # Vite Frontend SPA
│   ├── main.js               # Dynamic page loading, API calls, and socket loops
│   └── style.css             # UI styling overrides
├── index.html                # Main entry DOM container
├── package.json              # NPM frontend scripts
└── README.md                 # [NEW] This README root overview
```

---

## 🧭 Navigating Detailed Documentation

To deploy, run, monitor, or troubleshoot the FameHub platform, refer to the guides in the **`docs/`** directory:

1. **[System Architecture](file:///e:/famehub.com/docs/Architecture.md)**: Topology diagrams and component descriptions.
2. **[Docker Compose Setup Guide](file:///e:/famehub.com/docs/Deployment.md)**: Steps for quick Docker deployments.
3. **[Local Developer Guide](file:///e:/famehub.com/docs/DeveloperGuide.md)**: Setup instructions, dev scripts, and mock fallbacks.
4. **[Admin Panel Manual](file:///e:/famehub.com/docs/AdminGuide.md)**: Managing users, departments, and course enrollments.
5. **[Teacher & Student Manual](file:///e:/famehub.com/docs/UserGuide.md)**: Virtual classroom guidelines and general platform workflows.
6. **[REST API Reference](file:///e:/famehub.com/docs/api.md)**: REST route schemas and request/response specifications.
7. **[Database Schema Mapping](file:///e:/famehub.com/docs/Database.md)**: ER diagrams, associations, and seeder details.
8. **[Docker Container Specs](file:///e:/famehub.com/docs/Docker.md)**: Base image selections and common Docker CLI commands.
9. **[Kubernetes Deployment Guide](file:///e:/famehub.com/docs/Kubernetes.md)**: Manifest details and Minikube quickstarts.
10. **[AWS Cloud Migration Guide](file:///e:/famehub.com/docs/AWSDeployment.md)**: Moving PostgreSQL, Redis, and Kafka to AWS managed resources.
11. **[Telemetry & Monitoring Reference](file:///e:/famehub.com/docs/Monitoring.md)**: Prometheus endpoints and Grafana metrics dashboard.
12. **[Platform Security Design](file:///e:/famehub.com/docs/Security.md)**: JWT access tokens, token rotation, CSRF cookie validations, and limiters.
13. **[Troubleshooting Guide](file:///e:/famehub.com/docs/Troubleshooting.md)**: Common failure points, diagnostics, and quick resolutions.
14. **[Mermaid Sequence Workflows](file:///e:/famehub.com/docs/diagrams.md)**: Sequence diagrams of active sessions.

