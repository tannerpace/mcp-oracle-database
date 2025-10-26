# Logging System

The MCP Oracle Database server uses a lightweight, dependency-free logging module for all logging operations.

## Features

- ✅ **Zero Dependencies** - No external logging libraries required
- ✅ **Console & File Logging** - Supports both console output and optional file logging
- ✅ **Daily Log Rotation** - Automatically creates new log files each day
- ✅ **Colorized Output** - ANSI color codes for easy console reading
- ✅ **Log Levels** - Supports info, warn, error, and debug levels
- ✅ **Audit Logging** - Special audit logging for compliance tracking
- ✅ **Production-Safe** - Debug logs automatically disabled in production

## Configuration

Configure logging behavior using environment variables:

```env
# Enable/disable file logging (default: false)
ENABLE_FILE_LOGGING=true

# Directory for log files (default: ./logs)
LOG_DIR=./logs

# Log level (default: info)
LOG_LEVEL=info

# Enable audit logging (default: true)
ENABLE_AUDIT_LOGGING=true

# Environment mode (affects debug logging)
NODE_ENV=development
```

## Log Levels

### `info`
General informational messages about application operation.
```typescript
logger.info('Server started', { port: 3000 });
```

### `warn`
Warning messages for potentially problematic situations.
```typescript
logger.warn('Connection pool nearly full', { current: 9, max: 10 });
```

### `error`
Error messages for failure conditions.
```typescript
logger.error('Query failed', { error: err.message });
```

### `debug`
Detailed debugging information (only shown in development mode).
```typescript
logger.debug('Query executed', { rowCount: 100, time: 45 });
```

## File Logging

When `ENABLE_FILE_LOGGING=true`, the logger creates daily log files in the format:

```
logs/
  app-2025-10-26.log
  app-2025-10-27.log
  app-2025-10-28.log
```

Each file contains all logs for that day with timestamps and log levels:

```
2025-10-26T10:30:00.000Z INFO: Server started {"port":3000}
2025-10-26T10:30:05.123Z INFO: Database connected {"poolSize":5}
2025-10-26T10:30:10.456Z WARN: High query load {"count":50}
2025-10-26T10:30:15.789Z ERROR: Query timeout {"query":"SELECT..."}
```

## Audit Logging

Use the `audit()` function for compliance and security logging:

```typescript
import { audit } from './utils/logger.js';

audit('User query executed', {
  userId: 'user123',
  query: 'SELECT * FROM users',
  rowCount: 10,
  executionTime: 45
});
```

Audit logs are prefixed with `[AUDIT]` and include structured metadata:

```
2025-10-26T10:30:00.000Z INFO: [AUDIT] User query executed {"userId":"user123","query":"SELECT * FROM users","rowCount":10,"executionTime":45}
```

## Production vs Development

### Development Mode (`NODE_ENV=development`)
- All log levels appear (info, warn, error, debug)
- Colorized console output
- Optional file logging

### Production Mode (`NODE_ENV=production`)
- Debug logs are suppressed
- Only info, warn, and error appear
- Colorized console output
- Optional file logging

## Usage Examples

### Basic Logging

```typescript
import logger from './utils/logger.js';

logger.info('Application started');
logger.warn('Cache is full');
logger.error('Connection failed');
logger.debug('Processing request', { id: 123 });
```

### Logging with Objects

```typescript
logger.info('User logged in', {
  userId: 'user123',
  timestamp: new Date().toISOString(),
  ipAddress: '192.168.1.1'
});
```

Objects are automatically serialized to JSON in log files:

```
2025-10-26T10:30:00.000Z INFO: User logged in {"userId":"user123","timestamp":"2025-10-26T10:30:00.000Z","ipAddress":"192.168.1.1"}
```

### Audit Logging

```typescript
import { audit } from './utils/logger.js';

// Log security-relevant events
audit('Database query executed', {
  query: sql.substring(0, 500),
  rowCount: result.rowCount,
  executionTime: endTime - startTime
});
```

## Log Rotation

Log files are automatically rotated daily based on the current date:

- **Automatic**: New file created each day with format `app-YYYY-MM-DD.log`
- **No cleanup**: Old logs are preserved (implement external log rotation if needed)
- **Concurrent safe**: Multiple processes can write to the same log file

### Managing Old Logs

To clean up old logs, use external tools:

```bash
# Keep only last 30 days of logs
find ./logs -name "app-*.log" -mtime +30 -delete

# Compress old logs
find ./logs -name "app-*.log" -mtime +7 -exec gzip {} \;
```

## Implementation Details

The logger is implemented in `src/utils/logger.ts` using only Node.js built-in modules:

- `fs` - File system operations
- `path` - Path manipulation
- `url` - ES module utilities

No external dependencies required.

## Migration from Winston

If you're upgrading from a Winston-based logger, the API is mostly compatible:

```typescript
// Old (Winston)
import logger from './logging/logger.js';
logger.info('message', { meta: 'data' });

// New (Lightweight logger)
import logger from './utils/logger.js';
logger.info('message', { meta: 'data' }); // Same API
```

The `audit()` function is also available for backward compatibility:

```typescript
import { audit } from './utils/logger.js';
audit('Event', { data: 'value' });
```
