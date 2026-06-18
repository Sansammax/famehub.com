import { kafka, useMock, localBus } from '../config/kafka.js';
import { AttendanceService } from './AttendanceService.js';
import { NotificationService } from './NotificationService.js';

const TOPICS = [
  'user-events',
  'attendance-events',
  'course-events',
  'assignment-events',
  'quiz-events',
  'audit-events',
  'notification-events',
  'live-class-events',
  'analytics-events',
  'chat-events',
  'recording-events'
];

class KafkaConsumerService {
  constructor() {
    this.consumer = null;
    this.isConnected = false;
    this.useMockLocal = useMock;
  }

  async start() {
    const handleMessage = async (topic, messageContent) => {
      try {
        const { eventType, data } = messageContent;
        console.log(`[KafkaConsumer] Recv <- Topic: "${topic}" | Event: "${eventType}"`);
        
        switch (topic) {
          case 'live-class-events':
            if (eventType === 'Student Joined Class') {
              await AttendanceService.handleJoin(data.email, data.name, data.meetingId, data.role);
            } else if (eventType === 'Student Left Class') {
              await AttendanceService.handleLeave(data.email, data.meetingId);
            } else if (eventType === 'Teacher Started Class') {
              await NotificationService.createNotification('all', `Live Class "${data.name}" has started! Join now.`, 'class_start');
            }
            break;

          case 'attendance-events':
            if (eventType === 'Attendance Marked') {
              await NotificationService.createNotification(
                data.userEmail,
                `Attendance marked as ${data.status} for meeting. Duration: ${Math.round(data.durationSeconds / 60)} min.`,
                'attendance'
              );
            }
            break;

          case 'course-events':
            if (eventType === 'Course Created') {
              await NotificationService.createNotification('all', `New course available: ${data.name}`, 'course');
            }
            break;

          case 'assignment-events':
            if (eventType === 'Assignment Created') {
              await NotificationService.createNotification('all', `New assignment posted: "${data.title}". Due soon.`, 'assignment');
            } else if (eventType === 'Assignment Submitted') {
              await NotificationService.createNotification(
                'teacher@famehub.edu',
                `Student ${data.studentName} submitted "${data.title}"${data.isLate ? ' (LATE)' : ''}.`,
                'assignment'
              );
            } else if (eventType === 'Assignment Graded') {
              await NotificationService.createNotification(
                data.studentId,
                `Your assignment has been graded: ${data.marks} marks.`,
                'assignment_graded'
              );
            }
            break;

          case 'quiz-events':
            if (eventType === 'Quiz Published') {
              await NotificationService.createNotification('all', `New quiz published: "${data.title}". Take it now!`, 'quiz');
            } else if (eventType === 'Quiz Submitted') {
              console.log(`[KafkaConsumer] Quiz attempt recorded — Score: ${data.score}, Passed: ${data.passed}`);
            }
            break;

          case 'audit-events':
            // Audit events are already written to DB in auditLogger.js; here just log them
            console.log(`[KafkaConsumer] [AUDIT] ${data.action} by ${data.userEmail}`);
            break;

          case 'recording-events':
            if (eventType === 'Recording Published') {
              await NotificationService.createNotification('all', `Recording for "${data.name}" is now available.`, 'recording');
            }
            break;

          case 'notification-events':
            await NotificationService.createNotification(data.userEmail, data.message, data.type);
            break;

          default:
            break;
        }
      } catch (err) {
        console.error(`[KafkaConsumer] Error handling message on topic "${topic}":`, err.message);
      }
    };

    if (this.useMockLocal) {
      console.log('[KafkaConsumer] Operating in Mock Mode. Subscribing to local EventEmitter...');
      for (const topic of TOPICS) {
        localBus.on(topic, (msg) => {
          handleMessage(topic, msg);
        });
      }
      return;
    }

    try {
      this.consumer = kafka.consumer({ groupId: 'famehub-lms-group' });
      await this.consumer.connect();
      this.isConnected = true;
      console.log('[KafkaConsumer] Successfully connected consumer.');

      for (const topic of TOPICS) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
      }

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const rawValue = message.value.toString();
            const parsed = JSON.parse(rawValue);
            await handleMessage(topic, parsed);
          } catch (e) {
            console.error('[KafkaConsumer] Failed to parse message value:', e.message);
          }
        }
      });
    } catch (err) {
      console.error('[KafkaConsumer] Connection failed, falling back to local event bus:', err.message);
      this.useMockLocal = true;
      await this.start(); // re-attempt in mock mode
    }
  }

  async stop() {
    if (this.consumer && this.isConnected) {
      await this.consumer.disconnect();
      this.isConnected = false;
      console.log('[KafkaConsumer] Consumer disconnected.');
    }
  }
}

const KafkaConsumer = new KafkaConsumerService();
export { KafkaConsumer };
export default KafkaConsumer;
