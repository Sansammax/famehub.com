import http from 'http';
import app from './app.js';
import { initWebSocket } from './sockets/socketHandler.js';
import { initDatabase } from './models/index.js';
import { KafkaProducer } from './services/KafkaProducer.js';
import { KafkaConsumer } from './services/KafkaConsumer.js';
import { AttendanceService } from './services/AttendanceService.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const startServer = async () => {
  try {
    // 1. Sync and Seed database
    await initDatabase();

    // 2. Setup WebSockets
    initWebSocket(server);
    logger.success('WebSocket server initialized.');

    // 3. Launch Kafka messaging producer connection
    await KafkaProducer.connect();

    // 4. Launch Kafka consumer loop subscription
    await KafkaConsumer.start();
    logger.success('Kafka message consumer engine started.');

    // 5. Run background classroom attendance scans
    AttendanceService.startMonitoring();

    // 6. Listen
    server.listen(PORT, () => {
      logger.success(`FameHub Enterprise Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });
  } catch (error) {
    logger.error('Fatal crash during server startup:', error);
    process.exit(1);
  }
};

// Handle termination signals
const handleShutdown = async () => {
  logger.info('Shutting down server services gracefully...');
  AttendanceService.stopMonitoring();
  
  try {
    await KafkaProducer.disconnect();
    await KafkaConsumer.stop();
  } catch (err) {
    logger.error('Error during Kafka disconnection:', err.message);
  }

  server.close(() => {
    logger.success('Server terminated cleanly.');
    process.exit(0);
  });
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);

startServer();
export default server;
