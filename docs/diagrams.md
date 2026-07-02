# FameHub System Diagrams & Workflows

This document contains Mermaid diagrams illustrating the FameHub LMS Enterprise Architecture, database structure, deployment topology, and messaging flows.

---

## 1. Software Architecture Diagram (System Topology)

```mermaid
graph TD
  subgraph Frontend ["Client Browser"]
    SPA["Vanilla JS SPA (Vite)"]
    WSClient["WebSocket Client"]
    UIControls["BBB Client / Video Canvas"]
  end

  subgraph Backend ["Node.js / Express Server"]
    ExpressApp["Express.js Application"]
    AuthMid["JWT Auth & CSRF Middleware"]
    WSServer["WebSocket Server"]
    
    subgraph Services ["LMS Event Core"]
      Producer["Kafka Producer"]
      Consumer["Kafka Consumer"]
      BBBService["BigBlueButton Service"]
      Attendance["Attendance Service"]
      Notification["Notification Service"]
      AIService["AI Service Integration"]
    end
  end

  subgraph Messaging ["Message Broker Ledger"]
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
  ExpressApp --> AuthMid
  AuthMid --> BBBService
  AuthMid --> AIService
  
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

## 2. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
  User ||--o{ CourseEnrollment : enrolls
  User ||--o{ Course : teaches
  User ||--o{ QuizAttempt : attempts
  User ||--o{ AssignmentSubmission : submits
  User ||--o{ AuditLog : performs
  Department ||--o{ User : contains
  Department ||--o{ Course : categorizes
  Course ||--o{ CourseEnrollment : has
  Course ||--o{ Assignment : contains
  Course ||--o{ Quiz : contains
  Assignment ||--o{ AssignmentSubmission : has
  Quiz ||--o{ QuizQuestion : contains
  Quiz ||--o{ QuizAttempt : has

  User {
    UUID id PK
    string email UK
    string password
    string role
    string firstName
    string lastName
    boolean isActive
  }
  Department {
    UUID id PK
    string name UK
    string description
  }
  Course {
    UUID id PK
    string title
    string description
    boolean isArchived
  }
  Quiz {
    UUID id PK
    string title
    boolean isPublished
    integer duration
  }
  QuizQuestion {
    UUID id PK
    text questionText
    enum type
    json options
    json correctAnswers
  }
  QuizAttempt {
    UUID id PK
    json answers
    float score
    boolean passed
    enum status
  }
```

---

## 3. Deployment Diagram (Docker / Kubernetes Topology)

```mermaid
graph TB
  Client[Client Browser] -->|HTTPS / WSS| Nginx[Nginx Reverse Proxy]
  Nginx -->|Proxy pass 3000| Frontend[Frontend Container / SPA]
  Nginx -->|Proxy pass 5000| Backend[Backend API Containers]
  Backend -->|Cache / WS Sessions| Redis[Redis Instance]
  Backend -->|Events Pub/Sub| Kafka[Kafka Cluster]
  Kafka --> Zookeeper[Zookeeper Service]
  Backend -->|Relational Storage| Postgres[(PostgreSQL DB)]
  Backend -->|External Call| BBB[BigBlueButton Server]
```

---

## 4. Kafka Event Flow Diagram

```mermaid
graph LR
  subgraph Producers
    UserController[User Controller]
    CourseController[Course Controller]
    QuizController[Quiz Controller]
    BBBService[BBB Service]
  end
  subgraph Topics [Kafka Broker]
    UserEvents[user-events]
    CourseEvents[course-events]
    QuizEvents[quiz-events]
    BBBEvents[live-class-events]
  end
  subgraph Consumers
    KafkaConsumer[Kafka Consumer Service]
  end
  subgraph Handlers
    AttendanceService[Attendance Service]
    NotificationService[Notification Service]
  end

  UserController -->|Publish| UserEvents
  CourseController -->|Publish| CourseEvents
  QuizController -->|Publish| QuizEvents
  BBBService -->|Publish| BBBEvents

  UserEvents -->|Poll| KafkaConsumer
  CourseEvents -->|Poll| KafkaConsumer
  QuizEvents -->|Poll| KafkaConsumer
  BBBEvents -->|Poll| KafkaConsumer

  KafkaConsumer --> AttendanceService
  KafkaConsumer --> NotificationService
```

---

## 5. BigBlueButton Integration Diagram

```mermaid
graph TD
  subgraph Backend
    Controller[Live Class Controller]
    BBBService[BBB Service Class]
  end
  subgraph BBB_Server [BigBlueButton Server API]
    API_Endpoint[API Endpoint]
    MeetingState[Meeting State Manager]
  end

  Controller -->|POST /api/live/join| BBBService
  BBBService -->|Compute checksum & Call create| API_Endpoint
  API_Endpoint -->|Return Status & Passwords| BBBService
  BBBService -->|Compute Checksum & Generate Join URL| Controller
  Controller -->|Redirect User| Client[Client Browser]
  Client -->|Join Meeting Room| MeetingState
  MeetingState -->|Webhooks / Events| KafkaConsumer[Kafka Consumer]
```

---

## 6. AI Architecture Diagram

```mermaid
graph TD
  subgraph Sockets
    wsHandler[socketHandler.js]
  end
  subgraph AIServices [AI Service Layer]
    ChatService[ChatService.js]
    QuizGen[QuizGenerator.js]
    AsgEval[AssignmentEvaluator.js]
    Recs[RecommendationService.js]
    LecSum[LectureSummarizer.js]
    SemSearch[SemanticSearch.js]
  end
  subgraph AIProviders [Abstractions & Wrappers]
    BaseProvider[Base Provider Wrapper]
    OpenAI[OpenAI Provider]
    Gemini[Gemini Provider]
    Ollama[Ollama Provider]
  end
  subgraph Telemetry
    AIMetrics[AIMetrics DB Model]
  end

  wsHandler -->|Stream request| ChatService
  ChatService --> BaseProvider
  QuizGen --> BaseProvider
  AsgEval --> BaseProvider
  Recs --> BaseProvider
  LecSum --> BaseProvider
  SemSearch --> BaseProvider

  BaseProvider --> OpenAI
  BaseProvider --> Gemini
  BaseProvider --> Ollama
  BaseProvider -->|Log Token usage & Costs| AIMetrics
```

---

## 7. Sequence Diagrams

### Grade Submission Flow (Plagiarism & AI Assistance)
```mermaid
sequenceDiagram
  actor Teacher
  participant SPA as Frontend UI
  participant API as Backend API
  participant AI as AssignmentEvaluator
  participant DB as Database

  Teacher->>SPA: Paste student paper text, click "Run AI Evaluation"
  SPA->>API: POST /api/assignments/:id/submissions/:subId/ai-evaluate { text }
  API->>AI: evaluateSubmission(text, rubric)
  AI->>API: returns { suggestedMarks, plagiarismScore, critique }
  API-->>SPA: JSON results
  SPA->>Teacher: Displays suggested marks & critique
  Teacher->>SPA: Adjusts values, clicks "Save Grade"
  SPA->>API: POST /api/assignments/grade { marks, feedback }
  API->>DB: Save Submission Grade
  API-->>SPA: Success toast
```

### WebSocket Chat Chunk Stream Flow
```mermaid
sequenceDiagram
  actor Student
  participant UI as Chat Widget
  participant Server as Sockets Handler
  participant AI as ChatService
  participant Provider as Gemini / OpenAI Provider

  Student->>UI: Types question, clicks Send
  UI->>Server: WebSocket: "AI_STREAM_REQUEST" { message, courseId }
  Server->>Server: Start chunk buffer
  Server->>AI: getChatResponseStream(message, history)
  AI->>Provider: invokeStreamResponse()
  loop streaming chunks
    Provider->>AI: Yield chunk
    AI->>Server: Stream chunk
    Server->>UI: WebSocket: "AI_CHUNK" { content }
    UI->>Student: Appends typing content
  end
  Server->>UI: WebSocket: "AI_TYPING_STOP"
```

### AI Quiz Drafting Flow
```mermaid
sequenceDiagram
  actor Teacher
  participant UI as Quiz Creator
  participant API as Backend API
  participant QGen as QuizGenerator
  participant DB as Database

  Teacher->>UI: Paste lecture text, click "Generate Questions"
  UI->>API: POST /api/quizzes/generate-questions { content }
  API->>QGen: generateQuestionsFromText(content)
  QGen-->>API: JSON structure (MCQ, multi-select, true-false questions)
  API-->>UI: Returns questions list
  UI->>Teacher: Renders editable questions
  Teacher->>UI: Adjusts details, clicks "Save Quiz"
  UI->>API: POST /api/quizzes { questions }
  API->>DB: BulkCreate QuizQuestions
  API-->>UI: Quiz saved successfully
```

---

## 8. Component Diagram

```mermaid
graph TD
  subgraph Frontend_App ["Frontend App Component"]
    UI[HTML/CSS/JS Router]
    WS_Client[WS Sockets Handler]
  end
  subgraph Backend_REST ["REST Engine Server"]
    Express[Express.js App]
    Routers[Route Controllers]
    Middleware[JWT / CSRF Middleware]
  end
  subgraph Event_Brokers ["Kafka Event Brokers"]
    KafkaProducer[Kafka Producer]
    KafkaConsumer[Kafka Consumer]
  end
  subgraph Background_Workers ["Event Workers"]
    Attendance[Attendance Loop Monitor]
    Notifications[Notification Dispatcher]
  end
  subgraph Storage_Layer ["Data & Cache Engines"]
    DB[(PostgreSQL / SQLite)]
    Redis[(Redis Status Store)]
  end

  UI -->|HTTPS Requests| Middleware
  Middleware --> Routers
  WS_Client <-->|WebSocket Upgrades| Express
  Routers --> KafkaProducer
  KafkaProducer -->|Publish| KafkaConsumer
  KafkaConsumer --> Attendance
  KafkaConsumer --> Notifications
  Attendance --> DB
  Notifications --> DB
  Routers --> Redis
```

---

## 9. Class Diagram

```mermaid
classDiagram
  class User {
    +UUID id
    +String email
    +String password
    +String role
    +Boolean isActive
    +uploadAvatar()
    +resetPassword()
  }
  class Course {
    +UUID id
    +String title
    +String description
    +Boolean isArchived
    +enrollStudent()
  }
  class Quiz {
    +UUID id
    +String title
    +Boolean isPublished
    +publishQuiz()
  }
  class QuizQuestion {
    +UUID id
    +String questionText
    +ENUM type
    +JSON options
    +JSON correctAnswers
  }
  class QuizAttempt {
    +UUID id
    +JSON answers
    +Float score
    +Boolean passed
    +submitAttempt()
  }
  class BigBlueButtonService {
    +createMeeting()
    +joinMeeting()
    +endMeeting()
  }
  class BaseAIProvider {
    +generateCompletion()
    +generateStream()
  }

  User "1" --> "*" QuizAttempt : attempts
  Course "1" --> "*" Quiz : has
  Quiz "1" --> "*" QuizQuestion : contains
  Quiz "1" --> "*" QuizAttempt : has
  BaseAIProvider <|-- OpenAIProvider
  BaseAIProvider <|-- GeminiProvider
  BaseAIProvider <|-- OllamaProvider
```
