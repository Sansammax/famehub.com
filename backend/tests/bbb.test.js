import axios from 'axios';
import { jest } from '@jest/globals';
import { BigBlueButtonService } from '../services/BigBlueButtonService.js';

describe('BigBlueButtonService (Production Integration)', () => {
  let axiosGetSpy;

  beforeEach(() => {
    axiosGetSpy = jest.spyOn(axios, 'get');
  });

  afterEach(() => {
    if (axiosGetSpy) {
      axiosGetSpy.mockRestore();
    }
  });

  test('createMeeting returns SUCCESS and calls axios.get', async () => {
    const mockXml = `<response><returncode>SUCCESS</returncode><meetingID>test-meeting-001</meetingID></response>`;
    axiosGetSpy.mockResolvedValueOnce({ data: mockXml });

    const result = await BigBlueButtonService.createMeeting('test-meeting-001', 'Test Class', {});
    expect(result.returncode).toBe('SUCCESS');
    expect(result.meetingID).toBe('test-meeting-001');
    expect(axiosGetSpy).toHaveBeenCalled();
  });

  test('joinMeeting returns signed URL pointing to remote bbb', () => {
    const url = BigBlueButtonService.joinMeeting('test-meeting-001', 'Alice', 'ap123', 'user-001', 'student');
    expect(url).toContain('https://app.bbbserver.com/bbb-integration-v2/');
    expect(url).toContain('checksum=');
    expect(url).toContain('meetingID=test-meeting-001');
  });

  test('endMeeting returns SUCCESS and calls axios.get', async () => {
    const mockXml = `<response><returncode>SUCCESS</returncode></response>`;
    axiosGetSpy.mockResolvedValueOnce({ data: mockXml });

    const result = await BigBlueButtonService.endMeeting('test-meeting-001', 'mp123');
    expect(result.returncode).toBe('SUCCESS');
    expect(axiosGetSpy).toHaveBeenCalled();
  });

  test('getMeetingInfo parses running meeting info and attendees', async () => {
    const mockXml = `
      <response>
        <returncode>SUCCESS</returncode>
        <running>true</running>
        <participantCount>1</participantCount>
        <attendees>
          <attendee>
            <userID>user-001</userID>
            <fullName>Alice</fullName>
            <role>MODERATOR</role>
          </attendee>
        </attendees>
      </response>
    `;
    axiosGetSpy.mockResolvedValueOnce({ data: mockXml });

    const result = await BigBlueButtonService.getMeetingInfo('test-meeting-001', 'mp123');
    expect(result.returncode).toBe('SUCCESS');
    expect(result.isRunning).toBe(true);
    expect(result.participantCount).toBe(1);
    expect(result.attendees).toHaveLength(1);
    expect(result.attendees[0].fullName).toBe('Alice');
    expect(result.attendees[0].role).toBe('moderator');
  });

  test('getRecordings parses recordings list', async () => {
    const mockXml = `
      <response>
        <returncode>SUCCESS</returncode>
        <recordings>
          <recording>
            <recordID>rec-001</recordID>
            <meetingID>meet-001</meetingID>
            <name>Test Lecture</name>
            <published>true</published>
            <startTime>1343750050</startTime>
            <playback>
              <format>
                <type>presentation</type>
                <url>https://playback.url/presentation</url>
              </format>
            </playback>
          </recording>
        </recordings>
      </response>
    `;
    axiosGetSpy.mockResolvedValueOnce({ data: mockXml });

    const recordings = await BigBlueButtonService.getRecordings('meet-001');
    expect(recordings).toHaveLength(1);
    expect(recordings[0].recordId).toBe('rec-001');
    expect(recordings[0].playbackUrl).toBe('https://playback.url/presentation');
  });
});
