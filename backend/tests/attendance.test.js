import request from 'supertest';
import { app } from '../app.js';
import { initDatabase, Meeting, Attendance } from '../models/index.js';

let teacherToken = '';
let studentToken = '';

beforeAll(async () => {
  await initDatabase();
  const [tRes, sRes] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'teacher@famehub.edu', password: 'password' }),
    request(app).post('/api/auth/login').send({ email: 'student@famehub.edu', password: 'password' })
  ]);
  teacherToken = tRes.body.token;
  studentToken = sRes.body.token;
});

describe('Attendance API', () => {
  test('GET /api/live/attendance - teacher can view attendance', async () => {
    const res = await request(app)
      .get('/api/live/attendance')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  test('GET /api/live/recordings - returns recordings', async () => {
    const res = await request(app)
      .get('/api/live/recordings')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.recordings).toBeInstanceOf(Array);
  });
});
