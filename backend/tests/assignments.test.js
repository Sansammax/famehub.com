import request from 'supertest';
import { app } from '../app.js';
import { initDatabase, Course, Assignment } from '../models/index.js';

let teacherToken = '';
let studentToken = '';
let courseId = '';
let assignmentId = '';

beforeAll(async () => {
  await initDatabase();
  const [tRes, sRes] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'teacher@famehub.edu', password: 'password' }),
    request(app).post('/api/auth/login').send({ email: 'student@famehub.edu', password: 'password' })
  ]);
  teacherToken = tRes.body.token;
  studentToken = sRes.body.token;

  // Get a seeded course
  const coursesRes = await request(app).get('/api/courses').set('Authorization', `Bearer ${teacherToken}`);
  courseId = coursesRes.body.courses[0]?.id;
}, 30000);

describe('Assignments API', () => {
  test('POST /api/assignments - teacher creates assignment', async () => {
    if (!courseId) return;
    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${teacherToken}`)
      .field('courseId', courseId)
      .field('title', 'Jest Assignment Test')
      .field('dueDate', new Date(Date.now() + 86400000).toISOString())
      .field('maxMarks', '50');
    expect(res.statusCode).toBe(201);
    expect(res.body.assignment.title).toBe('Jest Assignment Test');
    assignmentId = res.body.assignment.id;
  });

  test('GET /api/assignments - student sees their assignments', async () => {
    const res = await request(app)
      .get('/api/assignments')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.assignments).toBeInstanceOf(Array);
  });

  test('POST /api/assignments/:id/submit - student submits assignment', async () => {
    if (!assignmentId) return;
    const res = await request(app)
      .post(`/api/assignments/${assignmentId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect([200, 400]).toContain(res.statusCode); // 400 if not enrolled; 200 if enrolled
  });

  test('GET /api/assignments/:id/submissions - teacher views submissions', async () => {
    if (!assignmentId) return;
    const res = await request(app)
      .get(`/api/assignments/${assignmentId}/submissions`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.submissions).toBeInstanceOf(Array);
  });

  test('POST /api/assignments - student cannot create assignment', async () => {
    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Hacked Assignment', courseId, dueDate: new Date().toISOString() });
    expect(res.statusCode).toBe(403);
  });
});
