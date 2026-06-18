import request from 'supertest';
import { app } from '../app.js';
import { initDatabase } from '../models/index.js';

let adminToken = '';
let teacherToken = '';
let studentToken = '';

beforeAll(async () => {
  await initDatabase();

  // Login and capture tokens
  const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@famehub.edu', password: 'password' });
  adminToken = adminRes.body.token;

  const teacherRes = await request(app).post('/api/auth/login').send({ email: 'teacher@famehub.edu', password: 'password' });
  teacherToken = teacherRes.body.token;

  const studentRes = await request(app).post('/api/auth/login').send({ email: 'student@famehub.edu', password: 'password' });
  studentToken = studentRes.body.token;
});

describe('Auth API', () => {
  test('POST /api/auth/login - valid credentials returns token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@famehub.edu', password: 'password' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();
  });

  test('POST /api/auth/login - invalid password returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@famehub.edu', password: 'wrongpassword' });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/login - unknown email returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'anything' });
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/auth/me - returns current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe('admin@famehub.edu');
    expect(res.body.user).not.toHaveProperty('password');
  });

  test('GET /api/auth/me - rejects request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });
});

describe('User Management API', () => {
  test('GET /api/users - admin can list users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.users).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
  });

  test('GET /api/users - student cannot list all users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.statusCode).toBe(403);
  });
});
