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

---

## 🛠️ BigBlueButton HTML Simulator Mode

To enable developers to test the full event streaming workflow out-of-the-box (without requiring a dedicated public BBB server instance), the integration includes a built-in **Simulator Mode** (enabled via `isDemoMode = true` in `BigBlueButtonService.js`).

### How the Simulator Operates:
1. When a user creates or joins a meeting, `BigBlueButtonService.getJoinUrl(...)` returns a local Express redirect path:
   `http://localhost:5000/api/live/mock-classroom?meetingId=meet-xxx&fullName=User&role=student`
2. Navigating to this URL renders a custom dark-mode simulated video classroom in the browser.
3. The panel displays:
   - Micro/Cam controls.
   - Interactive lists showing connected users.
   - **Sim Join Button**: Triggers `POST /api/live/simulate-action` with student credentials. This publishes a real `Student Joined Class` event to Kafka, marking initial attendance logs.
   - **Sim Leave Button**: Dispatches `Student Left Class` events, marking attendance durations.
   - **Leave Classroom**: Terminates the active user's loop and redirects back to the LMS dashboard.
4. Active dashboards and chart elements update automatically via WebSockets.
