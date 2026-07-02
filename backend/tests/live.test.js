import request from 'supertest';
import { app } from '../app.js';
import { initDatabase, Course, CourseEnrollment } from '../models/index.js';

import { jest } from '@jest/globals';
import { BigBlueButtonService } from '../services/BigBlueButtonService.js';

let adminToken = '';
let teacherToken = '';
let studentToken = '';
let studentId = '';
let teacherId = '';
let enrolledCourseId = '';
let unenrolledCourseId = '';
let meetingIdEnrolled = '';
let meetingIdUnenrolled = '';

beforeAll(async () => {
  // Mock external BigBlueButtonService methods
  jest.spyOn(BigBlueButtonService, 'createMeeting').mockResolvedValue({ returncode: 'SUCCESS', meetingID: 'mock-id' });
  jest.spyOn(BigBlueButtonService, 'joinMeeting').mockReturnValue('https://mock-join-url.com');
  jest.spyOn(BigBlueButtonService, 'endMeeting').mockResolvedValue({ returncode: 'SUCCESS' });

  await initDatabase();

  const [adminRes, teacherRes, studentRes] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'admin@famehub.edu', password: 'password' }),
    request(app).post('/api/auth/login').send({ email: 'teacher@famehub.edu', password: 'password' }),
    request(app).post('/api/auth/login').send({ email: 'student@famehub.edu', password: 'password' })
  ]);

  adminToken = adminRes.body.token;
  teacherToken = teacherRes.body.token;
  studentToken = studentRes.body.token;
  studentId = studentRes.body.user.id;
  teacherId = teacherRes.body.user.id;

  // Create a course that teacher teaches
  const courseRes = await request(app)
    .post('/api/courses')
    .set('Authorization', `Bearer ${teacherToken}`)
    .send({ title: 'Enrolled Course via Jest', description: 'Student is in this', maxStudents: 5 });
  
  enrolledCourseId = courseRes.body.course.id;

  // Enroll student in that course
  await CourseEnrollment.create({
    courseId: enrolledCourseId,
    studentId: studentId
  });

  // Create a course that student is NOT enrolled in
  const newCourseRes = await request(app)
    .post('/api/courses')
    .set('Authorization', `Bearer ${teacherToken}`)
    .send({ title: 'Unenrolled Course via Jest', description: 'Student is not in this', maxStudents: 5 });
  
  unenrolledCourseId = newCourseRes.body.course.id;
}, 30000);

describe('Live Classroom API & Database Enforcements', () => {
  test('POST /api/live/create - fails if courseId is missing', async () => {
    const res = await request(app)
      .post('/api/live/create')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ name: 'Live without Course' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Course is mandatory');
  });

  test('POST /api/live/create - creates meeting successfully and populates fields', async () => {
    const res = await request(app)
      .post('/api/live/create')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        name: 'Math Session 1',
        courseId: enrolledCourseId
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.meeting.meetingId).toBeDefined();
    meetingIdEnrolled = res.body.meeting.meetingId;
  });

  test('POST /api/live/create - creates unenrolled meeting successfully', async () => {
    const res = await request(app)
      .post('/api/live/create')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        name: 'Secret Session 1',
        courseId: unenrolledCourseId
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    meetingIdUnenrolled = res.body.meeting.meetingId;
  });

  test('GET /api/live/meetings - student only sees active meetings for enrolled courses', async () => {
    const res = await request(app)
      .get('/api/live/meetings')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    const meetingIds = res.body.meetings.map(m => m.meetingId);
    expect(meetingIds).toContain(meetingIdEnrolled);
    expect(meetingIds).not.toContain(meetingIdUnenrolled);
  });

  test('POST /api/live/join - student can join enrolled course meeting', async () => {
    const res = await request(app)
      .post('/api/live/join')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        meetingId: meetingIdEnrolled,
        fullName: 'Alice Johnson',
        role: 'VIEWER'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.joinUrl).toBeDefined();
  });

  test('POST /api/live/join - student forbidden from joining unenrolled course meeting', async () => {
    const res = await request(app)
      .post('/api/live/join')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        meetingId: meetingIdUnenrolled,
        fullName: 'Alice Johnson',
        role: 'VIEWER'
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not enrolled');
  });

  test('POST /api/live/end - teacher can end meeting and updates database state', async () => {
    const res = await request(app)
      .post('/api/live/end')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        meetingId: meetingIdEnrolled
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it is no longer returned in active meetings for student
    const checkRes = await request(app)
      .get('/api/live/meetings')
      .set('Authorization', `Bearer ${studentToken}`);

    const meetingIds = checkRes.body.meetings.map(m => m.meetingId);
    expect(meetingIds).not.toContain(meetingIdEnrolled);
  });
});
