# BigBlueButton virtual Classroom Integration

FameHub integrates natively with **BigBlueButton (BBB)** to offer live interactive classrooms with whiteboard tools, voice/video sharing, breakout rooms, and user polling.

---

## 🔐 Checksum Generation

All requests sent to the BigBlueButton server require authentication via a SHA-1 checksum parameter.

### Checksum Algorithm
```text
checksum = sha1( api_method + query_parameters + shared_secret )
```

### Steps:
1. Sort query parameters alphabetically to ensure consistent signature generation across calls.
2. Build the query string: `meetingID=meet-1&name=Class1` (keys and values must be URL-encoded).
3. Concat: `create` + `meetingID=meet-1&name=Class1` + `Secret123`.
4. Run SHA-1 hashing to generate a hexadecimal checksum string.
5. Append query parameter: `&checksum=<HEX_CHECKSUM>`.

Example implementation in Node.js:
```javascript
import crypto from 'crypto';

function buildUrl(callName, params, url, secret) {
  const query = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const checksumString = callName + query + secret;
  const checksum = crypto.createHash('sha1').update(checksumString).digest('hex');

  return `${url}/${callName}?${query}&checksum=${checksum}`;
}
```

---

## 🗺️ Mapping BigBlueButton API Calls

| API Call | Method | Description | Used By |
| :--- | :--- | :--- | :--- |
| `/create` | `GET` | Registers a new classroom session. | `POST /api/live/create` |
| `/join` | `GET` | Redirects a user with correct credentials and role to the BBB room interface. | `POST /api/live/join` |
| `/end` | `GET` | Closes the meeting immediately. | `POST /api/live/end` |
| `/getMeetingInfo` | `GET` | Fetches active attendee listings and recording stats. | `GET /api/live/info/:meetingId` |
| `/getRecordings` | `GET` | Lists generated meeting record playbacks. | `GET /api/live/recordings` |

## ⚙️ Production Integration Configuration

The BigBlueButton integration connects directly to the official BigBlueButton API server.

### Environment Configuration:
Configure the following keys in your `backend/.env` file:
- `BBB_URL`: The official BigBlueButton API endpoint (e.g. `https://app.bbbserver.com/.../api`)
- `BBB_SECRET`: The secret key/token provided by your BigBlueButton service provider

Meetings created or joined inside the LMS will automatically open the real BigBlueButton room in a new browser tab for teachers (as Moderator) and students (as Viewer). Attendance and active participants are dynamically synchronized in the background via automated status polling.
