import { httpRequestCounter, httpRequestDurationHistogram } from '../utils/metrics.js';

export const metricsMiddleware = (req, res, next) => {
  if (req.path === '/metrics' || req.path === '/health') {
    return next();
  }

  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;
    
    const route = req.route ? req.route.path : req.path;
    const statusCode = res.statusCode;

    httpRequestCounter.inc({
      method: req.method,
      route: route || req.path,
      status_code: statusCode
    });

    httpRequestDurationHistogram.observe({
      method: req.method,
      route: route || req.path,
      status_code: statusCode
    }, durationInSeconds);
  });

  next();
};

export default metricsMiddleware;
