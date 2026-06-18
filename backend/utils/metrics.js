import client from 'prom-client';
import { getActiveWebSocketCount } from '../sockets/socketHandler.js';
import sequelize from '../config/database.js';
import { KafkaProducer } from '../services/KafkaProducer.js';
import { getRedisStatus } from './redisCache.js';

const registry = new client.Registry();

client.collectDefaultMetrics({ register: registry });

export const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestDurationHistogram = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 3, 5, 10]
});

export const websocketConnectionsGauge = new client.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections'
});

export const databaseUpGauge = new client.Gauge({
  name: 'database_up',
  help: 'Database connection status (1 = up, 0 = down)'
});

export const redisUpGauge = new client.Gauge({
  name: 'redis_up',
  help: 'Redis cache server connection status (1 = up, 0 = down)'
});

export const kafkaUpGauge = new client.Gauge({
  name: 'kafka_up',
  help: 'Kafka event broker connection status (1 = up, 0 = down)'
});

registry.registerMetric(httpRequestCounter);
registry.registerMetric(httpRequestDurationHistogram);
registry.registerMetric(websocketConnectionsGauge);
registry.registerMetric(databaseUpGauge);
registry.registerMetric(redisUpGauge);
registry.registerMetric(kafkaUpGauge);

export const updateMetrics = async () => {
  // Update active WS connections
  try {
    websocketConnectionsGauge.set(getActiveWebSocketCount());
  } catch (err) {
    websocketConnectionsGauge.set(0);
  }

  // Probe database
  try {
    await sequelize.authenticate();
    databaseUpGauge.set(1);
  } catch (error) {
    databaseUpGauge.set(0);
  }

  // Probe Redis
  try {
    const redisStatus = getRedisStatus();
    redisUpGauge.set(redisStatus.connected ? 1 : 0);
  } catch (error) {
    redisUpGauge.set(0);
  }

  // Probe Kafka
  try {
    kafkaUpGauge.set(KafkaProducer.isConnected ? 1 : 0);
  } catch (error) {
    kafkaUpGauge.set(0);
  }
};

export { registry };
export default registry;
