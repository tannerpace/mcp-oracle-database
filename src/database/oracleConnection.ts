import oracledb from 'oracledb';
import getConfig from '../config.js';
import logger from '../utils/logger.js';
import type { OraclePool, OraclePoolConfig } from './types.js';

const config = getConfig();

let pool: OraclePool | null = null;
let isClosing = false;

/**
 * Create and return a connection pool for the read-only Oracle database
 */
export async function getOrCreatePool(): Promise<OraclePool> {
  if (pool) {
    return pool;
  }

  const poolConfig: OraclePoolConfig = {
    connectionString: config.ORACLE_CONNECTION_STRING || '',
    user: config.ORACLE_USER || '',
    password: config.ORACLE_PASSWORD || '',
    poolMin: config.ORACLE_POOL_MIN,
    poolMax: config.ORACLE_POOL_MAX,
    poolIncrement: 1,
  };

  try {
    logger.info('Creating Oracle connection pool (read-only)', {
      connectionString: poolConfig.connectionString,
      user: poolConfig.user,
      poolMin: poolConfig.poolMin,
      poolMax: poolConfig.poolMax,
    });

    pool = await oracledb.createPool(poolConfig);
    logger.info('Oracle connection pool created successfully');
    return pool;
  } catch (err) {
    logger.error('Failed to create Oracle connection pool', { error: err });
    throw new Error('Database connection failed');
  }
}

/**
 * Get a connection from the pool
 */
export async function getConnection() {
  const currentPool = await getOrCreatePool();
  return currentPool.getConnection();
}

/**
 * Close the connection pool gracefully
 */
export async function closePool(): Promise<void> {
  if (pool && !isClosing) {
    try {
      isClosing = true;
      logger.info('Closing Oracle connection pool');
      await pool.close(10); // 10 second drain timeout
      pool = null;
      logger.info('Oracle connection pool closed');
    } catch (err) {
      logger.error('Error closing Oracle connection pool', { error: err });
      throw err;
    } finally {
      isClosing = false;
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await closePool();
  process.exit(0);
});
