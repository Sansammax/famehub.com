import request from 'supertest';
import { app } from '../app.js';
import { initDatabase } from '../models/index.js';

let adminToken = '';
let teacherToken = '';
let studentToken = '';
let studentId = '';
let createdUserId = '';
let courseId = '';
let createdQuizId = '';

beforeAll(async () => {
  await initDatabase();

  // Login and capture tokens
  const [adminRes, teacherRes, studentRes] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'admin@famehub.edu', password: 'password' }),
    request(app).post('/api/auth/login').send({ email: 'teacher@famehub.edu', password: 'password' }),
    request(app).post('/api/auth/login').send({ email: 'student@famehub.edu', password: 'password' })
  ]);

  adminToken = adminRes.body.token;
  teacherToken = teacherRes.body.token;
  studentToken = studentRes.body.token;
  studentId = studentRes.body.user.id;

  // Get a course id from the database (seeded during initDatabase)
  const coursesRes = await request(app)
    .get('/api/courses')
    .set('Authorization', `Bearer ${adminToken}`);
  
  if (coursesRes.body.courses && coursesRes.body.courses.length > 0) {
    courseId = coursesRes.body.courses[0].id;
  }
});

describe('User Management API Extended', () => {
  test('POST /api/users - admin can create a new user', async () => {
    const newUser = {
      email: 'jestuser@famehub.edu',
      password: 'password123',
      role: 'student',
      firstName: 'Jest',
      lastName: 'User',
      phone: '1234567890'
    };

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(newUser.email);
    createdUserId = res.body.user.id;
  });

  test('POST /api/users - fails on duplicate email registration', async () => {
    const newUser = {
      email: 'jestuser@famehub.edu',
      password: 'password123',
      role: 'student'
    };

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newUser);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/users - returns pagination, search, and filtering details', async () => {
    const res = await request(app)
      .get('/api/users?search=Jest&role=student&page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.users).toBeInstanceOf(Array);
    expect(res.body.users.length).toBeGreaterThan(0);
    expect(res.body.users[0].firstName).toBe('Jest');
  });

  test('GET /api/users/:id - fetches user details by id', async () => {
    const res = await request(app)
      .get(`/api/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.id).toBe(createdUserId);
    expect(res.body.user.firstName).toBe('Jest');
  });

  test('PUT /api/users/:id - admin can update user fields', async () => {
    const updates = {
      firstName: 'JestUpdated',
      lastName: 'UserUpdated',
      phone: '0987654321',
      isActive: true
    };

    const res = await request(app)
      .put(`/api/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updates);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const checkRes = await request(app)
      .get(`/api/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(checkRes.body.user.firstName).toBe('JestUpdated');
  });

  test('POST /api/users/:id/reset-password - admin can reset password', async () => {
    const res = await request(app)
      .post(`/api/users/${createdUserId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'newsecurepassword' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE /api/users/:id - admin can deactivate a user', async () => {
    const res = await request(app)
      .delete(`/api/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it is deactivated
    const checkRes = await request(app)
      .get(`/api/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(checkRes.body.user.isActive).toBe(false);
  });
});

describe('Quizzes API & Auto-Grading Engine Extended', () => {
  test('POST /api/quizzes - teacher can create quiz draft with questions', async () => {
    const quizPayload = {
      courseId,
      title: 'Jest Comprehensive Quiz',
      description: 'Covers MCQ, Multi, and True/False questions',
      duration: 15,
      totalMarks: 30,
      passingMarks: 15,
      questions: [
        {
          questionText: 'What is Jest?',
          type: 'mcq',
          options: ['A testing framework', 'A browser', 'A db'],
          correctAnswers: [0], // Option index 0
          marks: 10
        },
        {
          questionText: 'Select all features of FameHub.',
          type: 'multi',
          options: ['AI Grading', 'Realtime classrooms', 'Rocket launches'],
          correctAnswers: [0, 1], // Option indices 0 and 1
          marks: 10
        },
        {
          questionText: 'SQLite is used for tests.',
          type: 'truefalse',
          correctAnswers: ['true'],
          marks: 10
        }
      ]
    };

    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(quizPayload);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.quiz.title).toBe('Jest Comprehensive Quiz');
    expect(res.body.quiz.isPublished).toBe(false); // drafts by default
    createdQuizId = res.body.quiz.id;
  });

  test('GET /api/quizzes - students cannot see unpublished quiz drafts', async () => {
    const res = await request(app)
      .get(`/api/quizzes?courseId=${courseId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(200);
    const found = res.body.quizzes.find(q => q.id === createdQuizId);
    expect(found).toBeUndefined();
  });

  test('PUT /api/quizzes/:id - teacher can publish the quiz draft', async () => {
    const res = await request(app)
      .put(`/api/quizzes/${createdQuizId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ isPublished: true });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.quiz.isPublished).toBe(true);
  });

  test('GET /api/quizzes/:id - student gets quiz with answers sanitized out', async () => {
    const res = await request(app)
      .get(`/api/quizzes/${createdQuizId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.quiz.questions).toBeInstanceOf(Array);
    // Student should not see correctAnswers field
    expect(res.body.quiz.questions[0].correctAnswers).toBeUndefined();
  });

  test('POST /api/quizzes/:id/attempt - student starts attempt, saves draft, submits and gets graded', async () => {
    // 1. Fetch quiz to get question ids
    const quizDetails = await request(app)
      .get(`/api/quizzes/${createdQuizId}`)
      .set('Authorization', `Bearer ${teacherToken}`); // teacher sees correctAnswers

    const questions = quizDetails.body.quiz.questions;
    const qMcq = questions.find(q => q.type === 'mcq');
    const qMulti = questions.find(q => q.type === 'multi');
    const qTf = questions.find(q => q.type === 'truefalse');

    // 2. Start attempt
    let startRes = await request(app)
      .post(`/api/quizzes/${createdQuizId}/attempt`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});
    expect(startRes.statusCode).toBe(200);
    expect(startRes.body.action).toBe('started');

    // 3. Save draft answers (partial, wrong answers)
    const draftAnswers = {
      [qMcq.id]: 0,    // Correct
      [qMulti.id]: [0], // Partial/Incorrect (needs [0, 1])
      [qTf.id]: 'false' // Incorrect (correct is 'true')
    };

    let saveRes = await request(app)
      .post(`/api/quizzes/${createdQuizId}/attempt`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: draftAnswers });
    expect(saveRes.statusCode).toBe(200);
    expect(saveRes.body.action).toBe('saved');

    // 4. Submit attempt with corrected answers to score 100%
    const finalAnswers = {
      [qMcq.id]: 0,        // Correct (10 marks)
      [qMulti.id]: [0, 1], // Correct (10 marks)
      [qTf.id]: 'true'     // Correct (10 marks)
    };

    let submitRes = await request(app)
      .post(`/api/quizzes/${createdQuizId}/attempt`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: finalAnswers, submit: true });

    expect(submitRes.statusCode).toBe(200);
    expect(submitRes.body.action).toBe('submitted');
    expect(submitRes.body.score).toBe(30); // 10 + 10 + 10 = 30 marks
    expect(submitRes.body.passed).toBe(true);
  });

  test('GET /api/quizzes/:id/results - teacher can view quiz stats and submissions', async () => {
    const res = await request(app)
      .get(`/api/quizzes/${createdQuizId}/results`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.total).toBe(1);
    expect(res.body.stats.passed).toBe(1);
    expect(res.body.stats.avgScore).toBe('30.0');
    expect(res.body.attempts[0].student.id).toBe(studentId);
  });
});

describe('Audit Logs API Extended', () => {
  test('GET /api/audit-logs - returns audit log records for admin', async () => {
    const res = await request(app)
      .get('/api/audit-logs?page=1&limit=20')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.logs).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThan(0);
  });

  test('GET /api/audit-logs - filters audit logs by action, userEmail, and entity type', async () => {
    const res = await request(app)
      .get('/api/audit-logs?action=Quiz&userEmail=student&entity=QuizAttempt')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.logs.length).toBeGreaterThanOrEqual(1);
    expect(res.body.logs[0].action).toBe('Quiz Submitted');
  });

  test('GET /api/audit-logs - filters by date range (from / to)', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app)
      .get(`/api/audit-logs?from=${today}&to=${today}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/audit-logs - blocks access for student role (role restriction)', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe('Security & Middleware Constraints', () => {
  test('Anonymous request rejects with 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('Invalid login payload returns bad request or unauthorized status', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@famehub.edu', password: '' }); // missing password
    
    expect([400, 401]).toContain(res.statusCode);
  });
});
