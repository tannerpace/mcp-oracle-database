import { z } from 'zod';
import { getSchema } from '../database/queryExecutor.js';
import logger from '../utils/logger.js';

// Input schema for get_database_schema tool
export const GetSchemaSchema = z.object({
  tableName: z.string().optional(),
});

export type GetSchemaInput = z.infer<typeof GetSchemaSchema>;

/**
 * Get database schema information
 */
export async function getDatabaseSchema(input: GetSchemaInput = {}) {
  try {
    const validated = GetSchemaSchema.parse(input);

    logger.info('Getting database schema via MCP tool', {
      tableName: validated.tableName || 'all tables',
    });

    const result = await getSchema(validated.tableName);

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    logger.error('Get schema tool failed', { error: err.message });

    return {
      success: false,
      error: err.message || 'Unknown error occurred',
    };
  }
}
