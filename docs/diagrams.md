# FameHub System Diagrams & Workflows

This document contains Mermaid diagrams illustrating the FameHub Phase 2 Enterprise Architecture and execution sequence flows.

---

## 🏗️ System Architecture Topology

```mermaid
graph TD
  subgraph Frontend ["Client Browser"]
    SPA["Vanilla JS SPA (Vite)"]
    WSClient["WebSocket Client"]
    UIControls["BBB Simulator / Video Canvas"]
  end

  subgraph Backend ["Node.js / Express Server"]
    ExpressApp["Express.js Application"]
    AuthMid["JWT Auth Middleware"]
    RateLim["Rate Limiting & Helmet"]
    WSServer["WebSocket Server"]
    
    subgraph Services ["LMS Event Core"]
      Producer["Kafka Producer"]
      Consumer["Kafka Consumer"]
      BBBService["BigBlueButton Service"]
      Attendance["Attendance Service"]
      Notification["Notification Service"]
    end
  end

  subgraph Messaging ["Message broker Ledger"]
    KafkaBroker["Apache Kafka Topics"]
    LocalBus["Local EventBus Fallback"]
  end

  subgraph Caching ["In-Memory Caching"]
    Redis["Redis Server"]
    MemCache["Memory Cache Fallback"]
  end

  subgraph Storage ["Databases"]
    PostgreSQL["PostgreSQL Database"]
    SQLite["SQLite Database Fallback"]
  end

  SPA -->|HTTPS REST| ExpressApp
  WSClient <-->|WS Sockets / Upgrade| WSServer
  ExpressApp --> RateLim --> AuthMid
  AuthMid --> BBBService
  
  Producer -->|Publish Events| KafkaBroker
  Producer -->|Publish Events| LocalBus
  KafkaBroker -->|Subscribe Events| Consumer
  LocalBus -->|Subscribe Events| Consumer
  
  Consumer --> Attendance
  Consumer --> Notification
  
  Attendance --> PostgreSQL
  Attendance --> SQLite
  
  BBBService -->|Status Cache| Redis
  BBBService -->|Status Cache| MemCache
  
  Notification -->|Emit Alert| WSServer
```

---

## 🎬 Sequence Flows

### 1. Join Meeting Workflow

This diagram maps how a user retrieves signed credentials to join a virtual room:

```mermaid
sequenceDiagram
  autonumber
  actor User as Student / Teacher
  participant SPA as Frontend SPA
  participant API as Express Router
  participant BBB as BigBlueButtonService
  participant Kafka as KafkaProducer

  User->>SPA: Click "Join Live Class" or "Start Class"
  SPA->>API: POST /api/live/join { meetingId, fullName } (Bearer JWT)
  note over API: Authenticates token & verifies role
  API->>BBB: getJoinUrl(meetingId, fullName, password, email, role)
  note over BBB: Sorts parameters alphabetically<br/>Calculates sha1(api + params + secret)<br/>Builds signed join URL
  BBB-->>API: Returns signed Join URL
  alt is Student
    API->>Kafka: publishEvent("live-class-events", "Student Joined Class", details)
  else is Teacher
    note over API: Marks meeting running in database
  end
  API-->>SPA: Returns JSON { success: true, joinUrl }
  SPA->>User: Open URL in new window/tab (i.e. BigBlueButton / Simulator)
```

---

### 2. Attendance Monitoring Loop

Shows how attendance metrics are monitored dynamically based on classroom duration:

```mermaid
sequenceDiagram
  autonumber
  participant Consumer as Kafka Consumer
  participant Attendance as AttendanceService
  participant DB as SQLite / PostgreSQL
  participant Producer as Kafka Producer

  note over Attendance: Background Scanner loop ticks every 10s
  loop Periodic Duration Scans
    Attendance->>DB: Query active sessions (where leaveTime is NULL)
    alt Student is Active & stayed > threshold (60s)
      Attendance->>DB: Set status = 'Present'
      Attendance->>Producer: publishEvent("attendance-events", "Attendance Marked", Present)
    end
  end

  alt Student exits room (Simulator / BBB webhook)
    Consumer->>Attendance: Student Left Class event
    Attendance->>DB: Fetch attendance record
    note over Attendance: Calculates final session duration
    Attendance->>DB: Update leaveTime, duration & status
    Attendance->>Producer: publishEvent("attendance-events", "Attendance Marked", Final Status)
  end
```

---

### 3. Kafka Event Pipeline

Illustrates the asynchronous event publishing and consumer routing loops:

```mermaid
sequenceDiagram
  autonumber
  participant Trigger as Action Trigger (Controller)
  participant Producer as KafkaProducer
  participant Broker as Kafka Broker (or LocalBus)
  participant Consumer as KafkaConsumer
  participant Handler as Target Service (Attendance / Notification)

  Trigger->>Producer: publishEvent(topic, eventType, data)
  alt Kafka broker is connected
    Producer->>Broker: Send JSON message string
  else fallback mode
    Producer->>Broker: Emit event on local EventEmitter
  end
  note over Trigger: Returns REST HTTP response immediately (Non-blocking)
  
  Broker-->>Consumer: Poll message event
  Consumer->>Consumer: Route event based on topic and eventType
  Consumer->>Handler: Invoke execution method (e.g. handleJoin, createNotification)
```

---

### 4. WebSocket Notifications Flow

Maps how consumed background events result in instant visual toast popups in the browser:

```mermaid
sequenceDiagram
  autonumber
  participant Consumer as KafkaConsumer
  participant Notify as NotificationService
  participant DB as SQLite / PostgreSQL
  participant WS as WebSocket Server
  participant Client as Frontend SPA

  Consumer->>Notify: Consume event (e.g. Class started / Attendance marked)
  Notify->>DB: Create notification record (isRead: false)
  Notify->>WS: Invoke wsCallback(userEmail, notification)
  note over WS: Resolves target socket links from Client Map
  WS->>Client: Send JSON payload { type: "NOTIFICATION", data }
  Client->>Client: Append banner overlay & display toast popup
```
