# Apache Kafka Event Streaming Architecture

FameHub utilizes **Apache Kafka** as the event ledger to enable decoupled microservice integrations, real-time analytics updates, and push notifications.

---

## 🧭 Configured Topics

The following topics partition specific business domain contexts:

| Topic | Event Types | Producers | Consumers |
| :--- | :--- | :--- | :--- |
| `user-events` | `User Login`, `User Signup` | `authController` | Audit Loggers, Security Monitors |
| `live-class-events` | `Teacher Started Class`, `Student Joined`, `Student Left`, `Meeting Ended` | `liveController`, BigBlueButton API | `AttendanceService`, `NotificationService` |
| `attendance-events` | `Attendance Marked` | `AttendanceService` | `NotificationService`, Analytics Engines |
| `course-events` | `Course Created` | Syllabus Manager | `NotificationService` |
| `assignment-events` | `Assignment Uploaded`, `Assignment Submitted` | File Controllers | `NotificationService` |
| `recording-events` | `Recording Published` | `liveController` | `NotificationService` |
| `notification-events`| `Notification Broadcast` | Any microservice | `NotificationService` (DB & WS) |
| `analytics-events` | Metrics changes | Any Service | Rollup engines |

---

## 📋 Event Schemas & Payloads

Each event is serialized as a JSON string containing envelope fields (`eventType`, `timestamp`, `data`):

### 1. `Student Joined Class` (`live-class-events`)
Dispatched instantly when a user clicks the join link.
```json
{
  "eventType": "Student Joined Class",
  "timestamp": "2026-06-18T07:12:00.123Z",
  "data": {
    "email": "student@famehub.edu",
    "name": "Student Learner",
    "meetingId": "meet-f38a7b90",
    "role": "student"
  }
}
```

### 2. `Attendance Marked` (`attendance-events`)
Published when a user leaves the classroom session or crosses the stays-duration threshold.
```json
{
  "eventType": "Attendance Marked",
  "timestamp": "2026-06-18T07:13:00.456Z",
  "data": {
    "userEmail": "student@famehub.edu",
    "userName": "Student Learner",
    "meetingId": "meet-f38a7b90",
    "durationSeconds": 60,
    "status": "Present"
  }
}
```

### 3. `Teacher Started Class` (`live-class-events`)
Broadcasts alert triggers to notification modules when a host launches a room.
```json
{
  "eventType": "Teacher Started Class",
  "timestamp": "2026-06-18T07:11:55.789Z",
  "data": {
    "meetingId": "meet-f38a7b90",
    "name": "Advanced Mathematics 101",
    "teacherEmail": "teacher@famehub.edu"
  }
}
```

---

## ⚙️ Consumer Routing & Processing Loops

When the backend server launches:
1. `KafkaConsumer.start()` registers connection instances.
2. It subscribes to all defined topics in parallel.
3. Message loops run asynchronously inside Node event handlers to prevent API process blocking.
4. Message payloads route based on `topic` and `eventType`:
   - `Student Joined Class` triggers `AttendanceService.handleJoin(...)` to initialize/re-open attendance metrics.
   - `Student Left Class` triggers `AttendanceService.handleLeave(...)` to calculate duration and mark status.
   - `Attendance Marked` triggers `NotificationService.createNotification(...)` to alert users and store records.
   - `Recording Published` stores video files and broadcasts a WS notification.
   - Direct `notification-events` write to the DB and push over WebSocket sockets immediately.
