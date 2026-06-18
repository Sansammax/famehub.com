import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    let metaStr = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] ${level}: ${message}${stack ? `\n${stack}` : ''}${metaStr}`;
  })
);

const createRotateTransport = (filename, level) => {
  return new winston.transports.DailyRotateFile({
    filename: path.join('logs', `${filename}-%DATE%.log`),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    maxSize: '20m',
    level: level || 'info',
    format: logFormat
  });
};

const transports = [
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? logFormat : devFormat,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  })
];

// Always write logs to files in production
if (process.env.NODE_ENV === 'production') {
  transports.push(createRotateTransport('combined', 'info'));
  transports.push(createRotateTransport('error', 'error'));
} else {
  // In development, also write to files for local verification but without daily rotation restrictions
  transports.push(new winston.transports.File({ filename: 'logs/combined.log', format: logFormat, level: 'info' }));
  transports.push(new winston.transports.File({ filename: 'logs/error.log', format: logFormat, level: 'error' }));
}

const mainLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports
});

const createSpecificLogger = (name) => {
  const specificTransports = [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : devFormat,
      level: 'info'
    })
  ];
  if (process.env.NODE_ENV === 'production') {
    specificTransports.push(createRotateTransport(name, 'info'));
  } else {
    specificTransports.push(new winston.transports.File({ filename: `logs/${name}.log`, format: logFormat }));
  }
  return winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: specificTransports
  });
};

const auditLogger = createSpecificLogger('audit');
const kafkaLogger = createSpecificLogger('kafka');
const bbbLogger = createSpecificLogger('bbb');

export const logger = {
  info: (message, ...args) => mainLogger.info(message, ...args),
  success: (message, ...args) => mainLogger.info(`[SUCCESS] ${message}`, ...args),
  warn: (message, ...args) => mainLogger.warn(message, ...args),
  error: (message, ...args) => mainLogger.error(message, ...args),
  audit: (action, userEmail, details) => {
    auditLogger.info(`Action: ${action} | User: ${userEmail}`, { details });
  },
  kafka: (message, ...args) => kafkaLogger.info(message, ...args),
  bbb: (message, ...args) => bbbLogger.info(message, ...args)
};

export default logger;
