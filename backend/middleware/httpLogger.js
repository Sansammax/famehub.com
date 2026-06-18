import morgan from 'morgan';
import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

const accessLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

const accessTransports = [];
if (process.env.NODE_ENV === 'production') {
  accessTransports.push(new winston.transports.DailyRotateFile({
    filename: path.join('logs', 'access-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    maxSize: '20m',
    format: accessLogFormat
  }));
} else {
  accessTransports.push(new winston.transports.File({
    filename: 'logs/access.log',
    format: accessLogFormat
  }));
}

const accessLogger = winston.createLogger({
  level: 'info',
  format: accessLogFormat,
  transports: accessTransports
});

const stream = {
  write: (message) => {
    accessLogger.info(message.trim());
  }
};

// Morgan format mimicking combined format but including response-time
export const httpLogger = morgan(
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms',
  { stream }
);

export default httpLogger;
