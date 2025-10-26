// src/utils/logger.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes (no dependencies)
const COLORS = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

// Create timestamp
const timestamp = () => new Date().toISOString();

// Configure log file path from environment variable
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../../logs');
const ENABLE_FILE_LOGGING = process.env.ENABLE_FILE_LOGGING === 'true';

// Ensure log directory exists
if (ENABLE_FILE_LOGGING && !fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Generate daily log file path
const getLogFilePath = () => {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOG_DIR, `app-${date}.log`);
};

// Write a message to the current day's log file
const writeToFile = (message: string) => {
  if (!ENABLE_FILE_LOGGING) return;
  const logFilePath = getLogFilePath();
  fs.appendFile(logFilePath, message + '\n', (err) => {
    if (err) console.error('Logger file write error:', err);
  });
};

// Format and print log messages
const log = (level: string, color: string, ...args: any[]) => {
  // Format args for file logging - stringify objects
  const fileArgs = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  });
  
  const message = `${timestamp()} ${level.toUpperCase()}: ${fileArgs.join(' ')}`;
  console.log(`${COLORS.gray}${timestamp()}${COLORS.reset} ${color}${level.toUpperCase()}:${COLORS.reset}`, ...args);
  writeToFile(message);
};

// Export logger API
export const logger = {
  info: (...args: any[]) => log('info', COLORS.cyan, ...args),
  warn: (...args: any[]) => log('warn', COLORS.yellow, ...args),
  error: (...args: any[]) => log('error', COLORS.red, ...args),
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      log('debug', COLORS.gray, ...args);
    }
  },
};

// Export audit function for compatibility with existing code
export function audit(message: string, meta?: Record<string, unknown>) {
  const enableAuditLogging = process.env.ENABLE_AUDIT_LOGGING === 'true';
  if (enableAuditLogging) {
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    logger.info(`[AUDIT] ${message}${metaStr}`);
  }
}

export default logger;
