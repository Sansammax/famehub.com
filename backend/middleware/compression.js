import compression from 'compression';

// Only compress responses if they are larger than 1KB
export const compressionMiddleware = compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
});

export default compressionMiddleware;
