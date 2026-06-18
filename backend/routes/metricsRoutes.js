import express from 'express';
import { registry, updateMetrics } from '../utils/metrics.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await updateMetrics();
    res.set('Content-Type', registry.contentType);
    res.send(await registry.metrics());
  } catch (err) {
    res.status(500).send({ success: false, error: err.message });
  }
});

export default router;
