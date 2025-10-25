import { z } from 'zod';
import { getSchema, executeQuery } from '../database/queryExecutor.js';
import logger from '../logging/logger.js';
import type { QueryResult } from '../database/types.js';

// Input schema for get_database_schema tool
export const GetSchemaSchema = z.object({
  tableName: z.string().optional(),
});

export type GetSchemaInput = z.infer<typeof GetSchemaSchema>;

// Maximum Levenshtein distance for table name suggestions
const MAX_LEVENSHTEIN_DISTANCE = 5;

// Maximum number of table suggestions to return
const MAX_TABLE_SUGGESTIONS = 3;

/**
 * Calculate Levenshtein distance between two strings for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Find similar table names based on Levenshtein distance
 */
async function findSimilarTableNames(tableName: string): Promise<string[]> {
  try {
    const query = `
      SELECT table_name
      FROM user_tables
      ORDER BY table_name
    `;
    
    const result: QueryResult = await executeQuery(query, { maxRows: 1000 });
    const allTables = result.rows.map((row: Record<string, any>) => row.TABLE_NAME as string);
    
    // Calculate distances and find closest matches
    const tableDistances = allTables.map((table: string) => ({
      name: table,
      distance: levenshteinDistance(tableName.toUpperCase(), table),
    }));
    
    // Sort by distance and return top matches
    return tableDistances
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MAX_TABLE_SUGGESTIONS)
      .filter(t => t.distance <= MAX_LEVENSHTEIN_DISTANCE)
      .map(t => t.name);
  } catch (err) {
    logger.error('Failed to find similar table names', { error: err });
    return [];
  }
}

/**
 * Get database schema information with enhanced error handling
 */
export async function getDatabaseSchema(input: GetSchemaInput = {}) {
  try {
    const validated = GetSchemaSchema.parse(input);

    logger.info('Getting database schema via MCP tool', {
      tableName: validated.tableName || 'all tables',
    });

    const result = await getSchema(validated.tableName);

    // Check if we got results when a specific table was requested
    if (validated.tableName && result.rowCount === 0) {
      // Table doesn't exist - provide helpful error message
      const similarTables = await findSimilarTableNames(validated.tableName);
      
      let errorMessage = `Table '${validated.tableName}' not found in the database.`;
      
      // Add case sensitivity hint
      errorMessage += `\n\nNote: Oracle table names are case-sensitive when queried from system tables. The table name is automatically converted to UPPERCASE ('${validated.tableName.toUpperCase()}') in the query.`;
      
      // Add suggestions if similar tables exist
      if (similarTables.length > 0) {
        errorMessage += `\n\nDid you mean one of these tables?\n${similarTables.map(t => `  - ${t}`).join('\n')}`;
        errorMessage += `\n\nTo get the schema for any of these tables, use:\n  { "tableName": "${similarTables[0]}" }`;
      } else {
        errorMessage += `\n\nTo see all available tables, call this tool without the tableName parameter:\n  get_database_schema()`;
      }
      
      logger.warn('Table not found', { 
        tableName: validated.tableName,
        suggestions: similarTables 
      });

      return {
        success: false,
        error: errorMessage,
        suggestions: similarTables,
        hint: 'List all tables first to see available table names',
      };
    }

    // Success case with optimization note
    const responseData: {
      success: boolean;
      data: QueryResult;
      hint?: string;
      optimization_note?: string;
    } = {
      success: true,
      data: result,
    };

    // Add helpful context for Copilot
    if (validated.tableName) {
      responseData.hint = `Successfully retrieved ${result.rowCount} column(s) for table '${validated.tableName}'.`;
      responseData.optimization_note = 'This query is already optimized: it uses indexed system tables (user_tab_columns) with direct table name lookup and limits results to 1000 rows.';
    } else {
      responseData.hint = `Successfully retrieved ${result.rowCount} table(s). To get column information for a specific table, call this tool again with the tableName parameter.`;
      responseData.optimization_note = 'This query is already optimized: it uses indexed system tables (user_tables) with minimal columns and limits results to 1000 rows.';
    }

    return responseData;
  } catch (err: any) {
    logger.error('Get schema tool failed', { error: err.message });

    // Enhanced error message with context
    let errorMessage = `Failed to retrieve database schema: ${err.message}`;
    
    // Provide specific guidance based on error type
    if (err.message.includes('ORA-00942')) {
      errorMessage += '\n\nThis error suggests the database user does not have SELECT privileges on system tables (user_tables, user_tab_columns).';
      errorMessage += '\nPlease ensure the database user has appropriate SELECT privileges.';
    } else if (err.message.includes('ORA-01017')) {
      errorMessage += '\n\nInvalid username/password. Please check the database credentials in the configuration.';
    } else if (err.message.includes('ORA-12545') || err.message.includes('ORA-12541')) {
      errorMessage += '\n\nCannot connect to database. Please check:';
      errorMessage += '\n  1. Database is running';
      errorMessage += '\n  2. Connection string is correct (format: hostname:port/servicename)';
      errorMessage += '\n  3. Network connectivity to the database';
    } else if (err.message.includes('timeout')) {
      errorMessage += '\n\nQuery timed out. This is unusual for schema queries. Please check database performance.';
    }

    return {
      success: false,
      error: errorMessage,
      original_error: err.message,
      troubleshooting: {
        check_permissions: 'Verify database user has SELECT on user_tables and user_tab_columns',
        check_connection: 'Ensure database is accessible and credentials are correct',
        list_all_tables: 'Try calling get_database_schema() without parameters to list all tables',
      },
    };
  }
}
