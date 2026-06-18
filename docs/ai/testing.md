# AI Testing & Verification

FameHub features a comprehensive Jest-based testing layer that exercises all AI modules, providers, custom utilities, and Express routes.

## Test Directory
The tests are placed under `backend/tests/ai.test.js`.

### Key Verification Specs
* **AI Providers**: Asserts embedding array output structure, active mock fallback switches, and message formatting.
* **Services**: Asserts that `ChatService`, `QuizGenerator`, `AssignmentEvaluator`, `RecommendationService`, and `LectureSummarizer` properly parse JSON responses and update metrics.
* **Routes**: Exercises middleware authority validation (e.g. standard students are forbidden from generating quizzes or listing engine metrics).

## Execution Command
To run all tests (including AI specifications):
```bash
npm test
```
To run only the AI test file:
```bash
npx jest tests/ai.test.js --runInBand --forceExit
```

## SQLite Isolation in Tests
To prevent files locking and unique constraint errors across parallel test executions, the database configuration in `backend/config/database.js` detects the Jest test runner environment (`process.env.JEST_WORKER_ID`) and automatically provisions an isolated, clean `:memory:` SQLite instance.
```javascript
if (process.env.JEST_WORKER_ID) {
  // provision in-memory DB for tests to guarantee speed and isolation
  storagePath = ':memory:';
}
```
If unique constraints on model associations (e.g., `AIFeedback.submissionId`) are triggered by contiguous test assertions, the test suites proactively wipe database state:
```javascript
await AIFeedback.destroy({ where: { submissionId: testSubmissionId } });
```
This strategy ensures that both backend models and endpoints are verified without database conflicts.
