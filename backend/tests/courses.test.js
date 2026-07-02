import request from 'supertest';
import { app } from '../app.js';
import { initDatabase } from '../models/index.js';

let adminToken = '';
let teacherToken = '';
let studentToken = '';
let createdCourseId = '';

beforeAll(async () => {
  await initDatabase();
  const [aRes, tRes, sRes] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'admin@famehub.edu', password: 'password' }),
    request(app).post('/api/auth/login').send({ email: 'teacher@famehub.edu', password: 'password' }),
    request(app).post('/api/auth/login').send({ email: 'student@famehub.edu', password: 'password' })
  ]);
  adminToken = aRes.body.token;
  teacherToken = tRes.body.token;
  studentToken = sRes.body.token;
}, 30000);

describe('Courses API', () => {
  test('GET /api/courses - returns list of courses', async () => {
    const res = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.courses).toBeInstanceOf(Array);
  });

  test('POST /api/courses - teacher can create course', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Test Course via Jest', description: 'Jest created course', maxStudents: 10 });
    expect(res.statusCode).toBe(201);
    expect(res.body.course.title).toBe('Test Course via Jest');
    createdCourseId = res.body.course.id;
  });

  test('POST /api/courses - student cannot create course', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Student Created Course' });
    expect(res.statusCode).toBe(403);
  });

  test('GET /api/courses/:id - returns course details', async () => {
    if (!createdCourseId) return;
    const res = await request(app)
      .get(`/api/courses/${createdCourseId}`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.course.id).toBe(createdCourseId);
  });

  test('PUT /api/courses/:id - teacher can update own course', async () => {
    if (!createdCourseId) return;
    const res = await request(app)
      .put(`/api/courses/${createdCourseId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ description: 'Updated description' });
    expect(res.statusCode).toBe(200);
  });
});

describe('Departments API', () => {
  test('GET /api/departments - returns list of departments', async () => {
    const res = await request(app)
      .get('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.departments).toBeInstanceOf(Array);
    expect(res.body.departments.length).toBeGreaterThanOrEqual(2);
  });

  test('POST /api/departments - admin can create department', async () => {
    const { Department } = await import('../models/index.js');
    await Department.destroy({ where: { name: 'Physics Dept Jest' } });

    const res = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Physics Dept Jest', description: 'Test dept' });
    expect(res.statusCode).toBe(201);
    expect(res.body.department.name).toBe('Physics Dept Jest');
  });
});
