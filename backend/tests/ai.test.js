import request from 'supertest';
import { app } from '../app.js';
import { initDatabase, Course, Meeting, Assignment, AssignmentSubmission, User, AIFeedback } from '../models/index.js';
import ChatService from '../src/ai/services/ChatService.js';
import QuizGenerator from '../src/ai/services/QuizGenerator.js';
import AssignmentEvaluator from '../src/ai/services/AssignmentEvaluator.js';
import RecommendationService from '../src/ai/services/RecommendationService.js';
import LectureSummarizer from '../src/ai/services/LectureSummarizer.js';
import SemanticSearch from '../src/ai/services/SemanticSearch.js';
import { getProviderName, chat, embed } from '../src/ai/providers/index.js';

let adminToken = '';
let teacherToken = '';
let studentToken = '';
let testCourseId = '';
let testMeetingId = 'test-meeting-123';
let testSubmissionId = '';
let teacherId = '';
let studentId = '';

beforeAll(async () => {
  try {
    await initDatabase();

    // Login to acquire tokens
    const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@famehub.edu', password: 'password' });
    adminToken = adminRes.body.token;

    const teacherRes = await request(app).post('/api/auth/login').send({ email: 'teacher@famehub.edu', password: 'password' });
    teacherToken = teacherRes.body.token;

    const studentRes = await request(app).post('/api/auth/login').send({ email: 'student@famehub.edu', password: 'password' });
    studentToken = studentRes.body.token;

    // Find a course
    const course = await Course.findOne();
    testCourseId = course ? course.id : 'a0000000-0000-0000-0000-000000000001';

    // Find seeded users
    const teacherUser = await User.findOne({ where: { role: 'teacher' } });
    const studentUser = await User.findOne({ where: { role: 'student' } });
    teacherId = teacherUser ? teacherUser.id : 'a0000000-0000-0000-0000-000000000002';
    studentId = studentUser ? studentUser.id : 'a0000000-0000-0000-0000-000000000003';

    // Create test meeting
    await Meeting.destroy({ where: { meetingId: testMeetingId } });
    const meeting = await Meeting.create({
      meetingId: testMeetingId,
      name: 'Intro to Quantum Computing',
      moderatorPW: 'mpw123',
      attendeePW: 'apw123',
      startedAt: new Date(),
      courseId: testCourseId
    });

    // Create an assignment and submission to get a test submission ID
    const assignment = await Assignment.create({
      courseId: testCourseId,
      teacherId: teacherId,
      title: 'Quantum Mechanics Lab 1',
      description: 'Explain superposition and entanglement.',
      dueDate: new Date(Date.now() + 86400000),
      maxMarks: 100
    });

    const submission = await AssignmentSubmission.create({
      assignmentId: assignment.id,
      studentId: studentId,
      status: 'pending',
      submissionUrl: 'http://localhost/quantum.txt'
    });
    testSubmissionId = submission.id;
  } catch (err) {
    console.error('Setup failed with error:', err);
    throw err;
  }
}, 30000);

describe('AI Providers', () => {
  test('Active provider is switchable and returns mock/actual name', () => {
    const provider = getProviderName();
    expect(provider).toBeTruthy();
    expect(['openai', 'gemini', 'ollama', 'mock']).toContain(provider);
  });

  test('embed returns a vector array of floats', async () => {
    const vector = await embed('Test query');
    expect(vector).toBeInstanceOf(Array);
    expect(vector.length).toBeGreaterThan(0);
    expect(typeof vector[0]).toBe('number');
  });

  test('chat returns a mock response string', async () => {
    const messages = [{ role: 'user', content: 'Say hello' }];
    const response = await chat(messages);
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  });
});

describe('AI Services', () => {
  test('ChatService stores user & assistant messages and retrieves history', async () => {
    const msg = 'What is functional programming?';
    const response = await ChatService.sendMessage(studentId, msg, testCourseId);
    expect(response).toBeTruthy();

    const history = await ChatService.getHistory(studentId, testCourseId);
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].role).toBe('user');
    expect(history[0].message).toBe(msg);
    expect(history[1].role).toBe('assistant');
  });

  test('QuizGenerator produces formatted questions', async () => {
    const textContent = 'Kafka is an event streaming platform. Zookeeper manages configurations.';
    const result = await QuizGenerator.generateQuiz(testCourseId, teacherId, textContent);
    expect(result.id).toBeTruthy();
    expect(result.questions).toBeInstanceOf(Array);
    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.questions[0]).toHaveProperty('questionText');
    expect(result.questions[0]).toHaveProperty('type');
  });

  test('AssignmentEvaluator rates submission, suggests marks and score', async () => {
    const result = await AssignmentEvaluator.evaluate(
      testSubmissionId,
      'I think superposition means a system is in multiple states at once until observed.',
      'Explain superposition and entanglement.',
      100,
      teacherId
    );
    expect(result.submissionId).toBe(testSubmissionId);
    expect(result.suggestedMarks).toBeGreaterThanOrEqual(0);
    expect(result.suggestedMarks).toBeLessThanOrEqual(100);
    expect(result.plagiarismScore).toBeGreaterThanOrEqual(0);
    expect(result.plagiarismScore).toBeLessThanOrEqual(1.0);
    expect(result.feedback).toBeTruthy();
  });

  test('RecommendationService compiles Weak Topics and Schedule', async () => {
    const result = await RecommendationService.getRecommendations(studentId);
    expect(result.studentId).toBe(studentId);
    expect(result.weakTopics).toBeInstanceOf(Array);
    expect(result.schedule).toBeTruthy();
  });

  test('LectureSummarizer summarizes and compiles notes', async () => {
    const result = await LectureSummarizer.summarize(testMeetingId, studentId);
    expect(result.meetingId).toBe(testMeetingId);
    expect(result.summary).toBeTruthy();
    expect(result.notes).toBeTruthy();
    expect(result.concepts).toBeInstanceOf(Array);
  });

  test('SemanticSearch scores matches and filters by descending score', async () => {
    const query = 'Problem Set Calculus';
    const results = await SemanticSearch.search(query, 3);
    expect(results).toBeInstanceOf(Array);
    if (results.length > 1) {
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    }
  });
});

describe('AI API Router Endpoints', () => {
  test('POST /api/ai/chat - returns response', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'Hello AI Assistant', courseId: testCourseId });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toBeTruthy();
  });

  test('POST /api/ai/generate-quiz - requires teacher/admin role', async () => {
    const res = await request(app)
      .post('/api/ai/generate-quiz')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ courseId: testCourseId, textContent: 'sample text' });
    expect(res.statusCode).toBe(403);
  });

  test('POST /api/ai/generate-quiz - returns generated quiz for teacher', async () => {
    const res = await request(app)
      .post('/api/ai/generate-quiz')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ courseId: testCourseId, textContent: 'sample text material' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.quiz.questions).toBeInstanceOf(Array);
  });

  test('POST /api/ai/evaluate-assignment - evaluations fail with missing fields', async () => {
    const res = await request(app)
      .post('/api/ai/evaluate-assignment')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ submissionId: testSubmissionId });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/ai/evaluate-assignment - works for teachers', async () => {
    await AIFeedback.destroy({ where: { submissionId: testSubmissionId } });
    const res = await request(app)
      .post('/api/ai/evaluate-assignment')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        submissionId: testSubmissionId,
        studentSubmission: 'my quantum answer',
        assignmentDescription: 'explain quantum',
        maxMarks: 100
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.feedback.feedback).toBeTruthy();
  });

  test('POST /api/ai/summarize-recording - summarizes', async () => {
    const res = await request(app)
      .post('/api/ai/summarize-recording')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ meetingId: testMeetingId });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.summary).toBeTruthy();
  });

  test('POST /api/ai/recommendations - returns recommendations', async () => {
    const res = await request(app)
      .post('/api/ai/recommendations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send();
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recommendations.weakTopics).toBeInstanceOf(Array);
  });

  test('POST /api/ai/search - searches semantic indexes', async () => {
    const res = await request(app)
      .post('/api/ai/search')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ query: 'problem' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results).toBeInstanceOf(Array);
  });

  test('GET /api/ai/history - fetches history', async () => {
    const res = await request(app)
      .get(`/api/ai/history?courseId=${testCourseId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.history).toBeInstanceOf(Array);
  });

  test('GET /api/ai/metrics - returns metrics for admin, forbidden for student', async () => {
    const failRes = await request(app)
      .get('/api/ai/metrics')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(failRes.statusCode).toBe(403);

    const okRes = await request(app)
      .get('/api/ai/metrics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(okRes.statusCode).toBe(200);
    expect(okRes.body.success).toBe(true);
    expect(okRes.body.metrics.totalRequests).toBeGreaterThanOrEqual(0);
  });
});
