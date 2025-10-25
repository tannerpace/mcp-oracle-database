import winston from 'winston';
import getConfig from '../config.js';

const config = getConfig();

const logger = winston.createLogger({
  level: config.LOG_LEVEL ?? 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console({ stderrLevels: ['error'] })],
});

export function audit(message: string, meta?: Record<string, unknown>) {
  if (config.ENABLE_AUDIT_LOGGING) {
    logger.info(message, { audit: true, ...meta });
  }
}

export default logger;
