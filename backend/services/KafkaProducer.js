import { kafka, useMock, localBus } from '../config/kafka.js';

class KafkaProducerService {
  constructor() {
    this.producer = null;
    this.isConnected = false;
    this.isInitializing = false;
    this.useMockLocal = useMock;
  }

  async connect() {
    if (this.useMockLocal) {
      console.log('[KafkaProducer] Operating in Mock Mode (using local event bus).');
      return;
    }

    if (this.isConnected || this.isInitializing) return;

    this.isInitializing = true;
    try {
      console.log('[KafkaProducer] Connecting to Kafka broker...');
      this.producer = kafka.producer();
      await this.producer.connect();
      this.isConnected = true;
      console.log('[KafkaProducer] Successfully connected to Kafka broker.');
    } catch (error) {
      console.error('[KafkaProducer] Connection failed. Falling back to Mock local event bus:', error.message);
      this.useMockLocal = true;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Publishes an event to a specified topic
   * @param {string} topic Topic name (e.g. 'user-events', 'attendance-events')
   * @param {string} eventName Event identifier (e.g. 'User Login', 'Student Joined Class')
   * @param {object} payload Content of the event
   */
  async publishEvent(topic, eventName, payload = {}) {
    const messageContent = {
      eventType: eventName,
      timestamp: new Date().toISOString(),
      data: payload
    };

    // Ensure connection is established
    if (!this.isConnected && !this.useMockLocal) {
      await this.connect();
    }

    if (this.useMockLocal) {
      // Mock publish: emit to local EventBus
      console.log(`[KafkaProducer] [MOCK] Pub -> Topic: "${topic}" | Event: "${eventName}"`);
      // Emit asynchronously to let event loop proceed
      setImmediate(() => {
        localBus.emit(topic, messageContent);
      });
      return true;
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          { value: JSON.stringify(messageContent) }
        ]
      });
      console.log(`[KafkaProducer] Published -> Topic: "${topic}" | Event: "${eventName}"`);
      return true;
    } catch (error) {
      console.error(`[KafkaProducer] Failed to publish event to topic "${topic}":`, error.message);
      // Fallback emit to keep system working
      localBus.emit(topic, messageContent);
      return false;
    }
  }

  async disconnect() {
    if (this.producer && this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('[KafkaProducer] Disconnected.');
    }
  }
}

const KafkaProducer = new KafkaProducerService();
export { KafkaProducer };
export default KafkaProducer;
