import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
import EventEmitter from 'events';

dotenv.config();

const brokers = process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'];
const clientId = process.env.KAFKA_CLIENT_ID || 'famehub-lms';

let kafka = null;
let useMock = false;

// Local EventEmitter acting as the event bus for Mock mode
const localBus = new EventEmitter();
localBus.setMaxListeners(100);

// Default to mock if brokers are explicitly not configured or we are in development and want safety
if (!process.env.KAFKA_BROKERS || process.env.KAFKA_BROKERS === 'localhost:9092') {
  // We will attempt to use real Kafka, but keep useMock ready to trigger if connection fails
  console.log('[Kafka] KAFKA_BROKERS set to localhost, will verify connection upon starting.');
}

try {
  kafka = new Kafka({
    clientId,
    brokers,
    connectionTimeout: 3000,
    retry: {
      initialRetryTime: 100,
      retries: 2
    }
  });
} catch (error) {
  console.error('[Kafka] Initialization error. Enabling mock event bus.', error.message);
  useMock = true;
}

export { kafka, useMock, localBus };
export default { kafka, useMock, localBus };
