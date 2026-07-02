import express from 'express';
import sequelize from '../config/database.js';
import { getRedisStatus } from '../utils/redisCache.js';
import { KafkaProducer } from '../services/KafkaProducer.js';
import { BigBlueButtonService } from '../services/BigBlueButtonService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const status = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    services: {
      database: 'DOWN',
      redis: 'DOWN',
      kafka: 'DOWN',
      bigbluebutton: 'DOWN'
    }
  };

  let degraded = false;

  // DB
  try {
    await sequelize.authenticate();
    status.services.database = 'UP';
  } catch (error) {
    status.services.database = 'DOWN';
    degraded = true;
  }

  // Redis
  try {
    const redisStatus = getRedisStatus();
    status.services.redis = redisStatus.connected ? 'UP' : (redisStatus.mock ? 'UP (Mock Fallback)' : 'DOWN');
    if (!redisStatus.connected && !redisStatus.mock) {
      degraded = true;
    }
  } catch (error) {
    status.services.redis = 'DOWN';
    degraded = true;
  }

  // Kafka
  try {
    status.services.kafka = KafkaProducer.isConnected ? 'UP' : (KafkaProducer.useMockLocal ? 'UP (Mock Fallback)' : 'DOWN');
    if (!KafkaProducer.isConnected && !KafkaProducer.useMockLocal) {
      degraded = true;
    }
  } catch (error) {
    status.services.kafka = 'DOWN';
    degraded = true;
  }

  // BigBlueButton
  try {
    await BigBlueButtonService.getRecordings();
    status.services.bigbluebutton = 'UP';
  } catch (error) {
    // If external BBB is not reachable, we log it, but do not necessarily fail healthcheck
    status.services.bigbluebutton = 'DOWN (Unavailable)';
  }

  if (degraded) {
    status.status = 'DEGRADED';
    return res.status(503).json(status);
  }

  res.status(200).json(status);
});

export default router;
