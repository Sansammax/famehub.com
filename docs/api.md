# FameHub REST API Specifications

All API routes are prefixed by `/api`. Secured endpoints require a valid JWT token sent in the headers as:
`Authorization: Bearer <JWT_TOKEN>`

---

## 🔑 Authentication Routes

### `POST /api/auth/register`
Registers a new user record.
- **Request Body**:
  ```json
  {
    "email": "teacher@famehub.edu",
    "password": "password",
    "role": "teacher"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": {
      "id": "a98dfb90-...",
      "email": "teacher@famehub.edu",
      "role": "teacher"
    }
  }
  ```

### `POST /api/auth/login`
Authenticates user and issues a JWT token.
- **Request Body**:
  ```json
  {
    "email": "student@famehub.edu",
    "password": "password"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": {
      "id": "e7b8c9d0-...",
      "email": "student@famehub.edu",
      "role": "student"
    }
  }
  ```

### `GET /api/auth/me`
Retrieves details of the currently authenticated token owner.
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "e7b8c9d0-...",
      "email": "student@famehub.edu",
      "role": "student"
    }
  }
  ```

---

## 📹 Live Meeting (BigBlueButton) Routes

### `POST /api/live/create`
Creates a meeting session in the database and registers it in the virtual room. (Restricted to roles: `'teacher'`, `'admin'`).
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Request Body**:
  ```json
  {
    "name": "Advanced Mathematics 101",
    "record": true
  }
  ```
- **Response (210 Created)**:
  ```json
  {
    "success": true,
    "meeting": {
      "meetingId": "meet-f38a7b90",
      "name": "Advanced Mathematics 101",
      "moderatorPW": "mod123",
      "attendeePW": "att123",
      "record": true
    }
  }
  ```

### `POST /api/live/join`
Computes signature checksum and generates the signed join URL.
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Request Body**:
  ```json
  {
    "meetingId": "meet-f38a7b90",
    "fullName": "Student Learner"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "joinUrl": "http://localhost:5000/api/live/mock-classroom?meetingId=meet-f38a7b90&fullName=Student%20Learner&role=student&userId=student%40famehub.edu"
  }
  ```

### `POST /api/live/end`
Force-terminates an active live meeting session. Ends active student attendance duration trackers. (Restricted to roles: `'teacher'`, `'admin'`).
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Request Body**:
  ```json
  {
    "meetingId": "meet-f38a7b90"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Meeting terminated successfully."
  }
  ```

### `GET /api/live/info/:meetingId`
Retrieves running status and participant counts. Cached in Redis/Memory for 10 seconds.
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "source": "api",
    "info": {
      "returncode": "SUCCESS",
      "meetingName": "Advanced Mathematics 101",
      "participantCount": 5,
      "isRunning": true
    }
  }
  ```

### `GET /api/live/recordings`
Retrieves list of published meeting video playbacks.
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "recordings": [
      {
        "recordId": "rec-001",
        "meetingId": "class-math-101",
        "name": "Advanced Mathematics 101 - Lecture 1",
        "published": true,
        "startTime": "2026-06-17T12:00:00Z",
        "playbackUrl": "https://demo.bigbluebutton.org/playback/presentation/2.3/playback.html?meetingId=class-math-101"
      }
    ]
  }
  ```

### `GET /api/live/active`
Lists all classrooms currently marked active and running.
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "meetings": [
      {
        "meetingId": "meet-f38a7b90",
        "name": "Advanced Mathematics 101",
        "isRunning": true,
        "record": true
      }
    ]
  }
  ```

---

## 📊 Analytics and Dashboards Routes

### `GET /api/analytics/dashboard`
Aggregates statistical indicators for admin/teacher dashboards.
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "stats": {
      "activeMeetings": 1,
      "onlineStudents": 2,
      "currentParticipants": 3,
      "recordingStatus": "Active",
      "attendanceCount": 14,
      "liveChatActivity": 12
    },
    "notifications": [
      {
        "id": "e98b0f80-...",
        "userEmail": "all",
        "message": "Live Class \"Advanced Mathematics 101\" has started! Join now.",
        "type": "class_start",
        "isRead": false,
        "createdAt": "2026-06-18T07:12:00Z"
      }
    ]
  }
  ```

### `GET /api/analytics/charts`
Retrieves dataset distributions to plot CSS bar heights.
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "engagement": {
      "present": 8,
      "partial": 4,
      "absent": 2
    },
    "courseCompletion": [
      { "name": "Computer Science 101", "rate": 78 }
    ],
    "teacherEngagement": [
      { "name": "Prof. Smith", "classes": 24, "hours": 36 }
    ]
  }
  ```
