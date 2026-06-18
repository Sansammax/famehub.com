import { KafkaProducer } from '../services/KafkaProducer.js';

describe('KafkaProducer (Mock/Fallback Mode)', () => {
  test('publishEvent does not throw in mock mode', async () => {
    await expect(
      KafkaProducer.publishEvent('test-topic', 'TestEvent', { foo: 'bar' })
    ).resolves.not.toThrow();
  });

  test('publishEvent handles undefined data gracefully', async () => {
    await expect(
      KafkaProducer.publishEvent('test-topic', 'TestEvent', undefined)
    ).resolves.not.toThrow();
  });

  test('publishEvent handles null topic gracefully', async () => {
    await expect(
      KafkaProducer.publishEvent(null, 'TestEvent', {})
    ).resolves.not.toThrow();
  });
});
