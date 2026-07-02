import crypto from 'crypto';
import axios from 'axios';
import xml2js from 'xml2js';
import { bbbConfig } from '../config/bbb.js';

class BigBlueButtonServiceClass {
  constructor() {
    this.url = bbbConfig.url;
    this.secret = bbbConfig.secret;
  }

  // Generates signature checksum for BBB API call
  buildUrl(callName, params = {}) {
    const query = Object.keys(params)
      .sort() // BBB checksum requires parameters in alphabet sorted order
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    const checksumString = callName + query + this.secret;
    const checksum = crypto.createHash('sha1').update(checksumString).digest('hex');

    return `${this.url}/${callName}?${query}&checksum=${checksum}`;
  }

  // Common request helper that calls BBB API, parses XML response, and returns parsed JS object
  async makeRequest(callName, params = {}) {
    const callUrl = this.buildUrl(callName, params);
    try {
      const response = await axios.get(callUrl);
      const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
      const result = await parser.parseStringPromise(response.data);
      if (result && result.response) {
        return result.response;
      }
      return result;
    } catch (error) {
      console.error(`[BigBlueButtonService] API request failed for ${callName}:`, error.message);
      throw error;
    }
  }

  /**
   * Creates a meeting on BigBlueButton
   */
  async createMeeting(meetingId, name, options = {}) {
    const params = {
      meetingID: meetingId,
      name: name,
      attendeePW: options.attendeePW || 'ap123',
      moderatorPW: options.moderatorPW || 'mp123',
      record: options.record ? 'true' : 'false',
      allowStartStopRecording: 'true',
      autoStartRecording: 'false',
      ...options
    };

    const result = await this.makeRequest('create', params);
    if (result.returncode === 'SUCCESS') {
      console.log(`[BigBlueButtonService] Meeting "${name}" created on remote BBB.`);
      return {
        returncode: 'SUCCESS',
        meetingID: meetingId,
        name: name,
        attendeePW: params.attendeePW,
        moderatorPW: params.moderatorPW
      };
    } else {
      throw new Error(`BBB server returned failure code on create: ${result.messageKey || result.message}`);
    }
  }

  /**
   * Gets join meeting URL (moderator or attendee)
   */
  joinMeeting(meetingId, fullName, password, userId, role = 'student') {
    const params = {
      meetingID: meetingId,
      fullName: fullName,
      password: password,
      userID: userId,
      redirect: 'true'
    };

    return this.buildUrl('join', params);
  }

  // Alias for backward compatibility
  getJoinUrl(meetingId, fullName, password, userId, role = 'student') {
    return this.joinMeeting(meetingId, fullName, password, userId, role);
  }

  /**
   * Force ends a meeting session
   */
  async endMeeting(meetingId, moderatorPassword) {
    const params = {
      meetingID: meetingId,
      password: moderatorPassword
    };

    const result = await this.makeRequest('end', params);
    if (result.returncode === 'SUCCESS') {
      console.log(`[BigBlueButtonService] Meeting "${meetingId}" force ended on BBB.`);
      return { returncode: 'SUCCESS' };
    }
    throw new Error(`BBB server returned failure code on end: ${result.messageKey || result.message}`);
  }

  /**
   * Retrieves active meeting information
   */
  async getMeetingInfo(meetingId, moderatorPassword) {
    const params = {
      meetingID: meetingId,
      password: moderatorPassword
    };

    try {
      const result = await this.makeRequest('getMeetingInfo', params);
      if (result.returncode !== 'SUCCESS') {
        return {
          returncode: 'FAILED',
          isRunning: false,
          participantCount: 0,
          attendees: []
        };
      }

      const isRunning = result.running === 'true' || result.running === true;
      const participantCount = parseInt(result.participantCount || 0, 10);

      let attendees = [];
      if (result.attendees && result.attendees.attendee) {
        const att = result.attendees.attendee;
        const rawAttendees = Array.isArray(att) ? att : [att];
        attendees = rawAttendees.map(a => ({
          userId: a.userID,
          fullName: a.fullName,
          role: String(a.role).toLowerCase()
        }));
      }

      return {
        returncode: 'SUCCESS',
        isRunning,
        participantCount,
        attendees
      };
    } catch (error) {
      console.error(`[BigBlueButtonService] Error getting meeting info for ${meetingId}:`, error.message);
      return {
        returncode: 'FAILED',
        isRunning: false,
        participantCount: 0,
        attendees: []
      };
    }
  }

  /**
   * Gets list of running meetings
   */
  async getMeetings() {
    try {
      const result = await this.makeRequest('getMeetings');
      if (result.returncode !== 'SUCCESS') {
        return [];
      }

      let meetingsList = [];
      if (result.meetings && result.meetings.meeting) {
        const m = result.meetings.meeting;
        meetingsList = Array.isArray(m) ? m : [m];
      }

      return meetingsList.map(m => ({
        meetingId: m.meetingID,
        name: m.meetingName,
        isRunning: m.running === 'true' || m.running === true,
        participantCount: parseInt(m.participantCount || 0, 10),
        createTime: m.createTime
      }));
    } catch (error) {
      console.error('[BigBlueButtonService] Error getting meetings list:', error.message);
      return [];
    }
  }

  /**
   * Checks if a meeting is running
   */
  async isMeetingRunning(meetingId) {
    try {
      const meetings = await this.getMeetings();
      return meetings.some(m => m.meetingId === meetingId && m.isRunning);
    } catch (error) {
      console.error(`[BigBlueButtonService] Error checking running status for ${meetingId}:`, error.message);
      return false;
    }
  }

  /**
   * Gets list of recordings
   */
  async getRecordings(meetingId = '') {
    const params = {};
    if (meetingId) params.meetingID = meetingId;

    try {
      const result = await this.makeRequest('getRecordings', params);
      if (result.returncode !== 'SUCCESS') {
        return [];
      }

      let recordingsList = [];
      if (result.recordings && result.recordings.recording) {
        const recs = result.recordings.recording;
        recordingsList = Array.isArray(recs) ? recs : [recs];
      }

      return recordingsList.map(r => {
        let playbackUrl = '';
        if (r.playback && r.playback.format) {
          const formats = Array.isArray(r.playback.format) ? r.playback.format : [r.playback.format];
          const presFormat = formats.find(f => f.type === 'presentation') || formats[0];
          playbackUrl = presFormat ? presFormat.url : '';
        }

        return {
          recordId: r.recordID,
          meetingId: r.meetingID,
          name: r.name,
          published: r.published === 'true' || r.published === true,
          startTime: r.startTime,
          playbackUrl
        };
      });
    } catch (error) {
      console.error('[BigBlueButtonService] Error getting recordings:', error.message);
      return [];
    }
  }
}

export const BigBlueButtonService = new BigBlueButtonServiceClass();
export default BigBlueButtonService;
