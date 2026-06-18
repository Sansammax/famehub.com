import { BigBlueButtonService } from '../services/BigBlueButtonService.js';

describe('BigBlueButtonService (Mock Mode)', () => {
  test('createMeeting returns SUCCESS in mock mode', async () => {
    const result = await BigBlueButtonService.createMeeting('test-meeting-001', 'Test Class', {});
    expect(result.returncode).toBe('SUCCESS');
    expect(result.meetingID).toBe('test-meeting-001');
  });

  test('getJoinUrl returns localhost URL in mock mode', () => {
    const url = BigBlueButtonService.getJoinUrl('test-meeting-001', 'Alice', 'ap123', 'user-001', 'student');
    expect(url).toContain('localhost');
    expect(url).toContain('meetingId=test-meeting-001');
  });

  test('endMeeting returns SUCCESS in mock mode', async () => {
    const result = await BigBlueButtonService.endMeeting('test-meeting-001', 'mp123');
    expect(result.returncode).toBe('SUCCESS');
  });

  test('getMeetingInfo returns mock data in mock mode', async () => {
    const result = await BigBlueButtonService.getMeetingInfo('test-meeting-001', 'mp123');
    expect(result.returncode).toBe('SUCCESS');
    expect(typeof result.participantCount).toBe('number');
    expect(typeof result.isRunning).toBe('boolean');
  });

  test('getRecordings returns array in mock mode', async () => {
    const recordings = await BigBlueButtonService.getRecordings();
    expect(Array.isArray(recordings)).toBe(true);
    expect(recordings.length).toBeGreaterThan(0);
    expect(recordings[0]).toHaveProperty('recordId');
    expect(recordings[0]).toHaveProperty('playbackUrl');
  });

  test('buildUrl generates valid URL format', () => {
    const url = BigBlueButtonService.buildUrl('create', { meetingID: 'abc', name: 'Test' });
    expect(url).toContain('checksum=');
    expect(url).toContain('meetingID=abc');
  });
});
