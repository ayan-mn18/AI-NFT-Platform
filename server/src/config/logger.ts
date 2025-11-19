import winston from 'winston';
import config from './env';

/**
 * Winston Logger Configuration
 * Provides structured logging with file rotation and multiple transports
 */

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.ms(),
  winston.format.errors({ stack: true }),
  config.logFormat === 'json'
    ? winston.format.json()
    : winston.format.printf(
        (info) =>
          `${info.timestamp} ${info.level}: ${info.message}${
            info.stack ? '\n' + info.stack : ''
          }`
      )
);

const transports = [
  // Console transport for all logs
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) =>
          `${info.timestamp} ${info.level}: ${info.message}${
            info.ms ? ` [${info.ms}]` : ''
          }${info.stack ? '\n' + info.stack : ''}`
      )
    ),
  }),

  // Error log file
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format,
  }),

  // Combined log file
  new winston.transports.File({
    filename: 'logs/combined.log',
    format,
  }),
];

// In production, skip console and use only files
if (config.nodeEnv === 'production') {
  transports.shift(); // Remove console
}

const logger = winston.createLogger({
  level: config.logLevel,
  levels,
  format,
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

/**
 * Log Methods
 */
export default {
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  http: (message: string, meta?: any) => logger.info(message, meta),
};
