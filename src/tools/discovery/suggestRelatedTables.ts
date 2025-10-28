import { z } from 'zod';
import { getConnection } from '../../database/oracleConnection.js';
import logger, { audit } from '../../utils/logger.js';
import type { RelatedTableHint } from './types.js';

// Input schema for suggestRelatedTables tool
export const SuggestRelatedTablesSchema = z.object({
  tableName: z.string().min(1, 'Table name is required'),
  maxSuggestions: z.number().int().min(1).max(20).optional().default(10),
});

export type SuggestRelatedTablesInput = z.infer<typeof SuggestRelatedTablesSchema>;

/**
 * Suggest tables related to the given table by foreign keys, naming patterns, or shared columns
 * 
 * This tool analyzes:
 * - Foreign key relationships (highest confidence)
 * - Naming patterns (e.g., ORDER_ITEMS related to ORDERS)
 * - Shared column names (e.g., both have CUSTOMER_ID)
 * 
 * Returns suggestions with confidence scores and relationship descriptions.
 * Helps LLMs discover relevant tables for complex queries.
 * 
 * @param input - Table name and max suggestions
 * @returns Related table suggestions with confidence scores
 */
export async function suggestRelatedTables(input: SuggestRelatedTablesInput): Promise<{
  success: boolean;
  data?: RelatedTableHint[];
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const validated = SuggestRelatedTablesSchema.parse(input);
    const tableNameUpper = validated.tableName.toUpperCase();
    const maxSuggestions = validated.maxSuggestions || 10;

    logger.info('Suggesting related tables', {
      tableName: tableNameUpper,
      maxSuggestions,
    });

    let connection;
    
    try {
      connection = await getConnection();

      const hints: RelatedTableHint[] = [];

      // 1. Find tables related by foreign keys (confidence: 1.0)
      const fkQuery = `
        SELECT DISTINCT
          CASE 
            WHEN c.table_name = :tableName THEN rc.table_name
            ELSE c.table_name
          END as related_table,
          c.constraint_name
        FROM user_constraints c
        JOIN user_constraints rc ON c.r_constraint_name = rc.constraint_name
        WHERE c.constraint_type = 'R'
          AND (c.table_name = :tableName OR rc.table_name = :tableName)
          AND CASE 
            WHEN c.table_name = :tableName THEN rc.table_name
            ELSE c.table_name
          END != :tableName
      `;

      const fkResult = await connection.execute(
        fkQuery,
        [tableNameUpper, tableNameUpper, tableNameUpper, tableNameUpper],
        {
          outFormat: 2,
          maxRows: 100,
        }
      );

      const fkRows = fkResult.rows as any[];
      
      for (const row of fkRows) {
        hints.push({
          tableName: row.RELATED_TABLE,
          relationshipType: 'foreign_key',
          confidence: 1.0,
          description: `Foreign key relationship via ${row.CONSTRAINT_NAME}`,
        });
      }

      // 2. Find tables with similar naming patterns (confidence: 0.7)
      // Extract base name (e.g., "ORDER" from "ORDERS" or "ORDER_ITEMS")
      const baseName = extractBaseName(tableNameUpper);
      
      if (baseName) {
        const namingQuery = `
          SELECT table_name
          FROM user_tables
          WHERE table_name != :tableName
            AND (
              table_name LIKE :basePattern
              OR table_name LIKE :suffixPattern1
              OR table_name LIKE :suffixPattern2
            )
          ORDER BY table_name
          FETCH FIRST 20 ROWS ONLY
        `;

        const namingResult = await connection.execute(
          namingQuery,
          [
            tableNameUpper,
            `${baseName}%`,
            `%_${baseName}`,
            `%_${baseName}_%`,
          ],
          {
            outFormat: 2,
            maxRows: 20,
          }
        );

        const namingRows = namingResult.rows as any[];
        
        for (const row of namingRows) {
          const relatedTable = row.TABLE_NAME;
          
          // Skip if already added via FK
          if (!hints.find(h => h.tableName === relatedTable)) {
            hints.push({
              tableName: relatedTable,
              relationshipType: 'naming_pattern',
              confidence: 0.7,
              description: `Similar naming pattern (base: ${baseName})`,
            });
          }
        }
      }

      // 3. Find tables with shared column names (confidence: 0.5)
      const sharedColumnsQuery = `
        SELECT DISTINCT
          c2.table_name,
          COUNT(DISTINCT c1.column_name) as shared_count
        FROM user_tab_columns c1
        JOIN user_tab_columns c2 
          ON c1.column_name = c2.column_name
          AND c2.table_name != c1.table_name
        WHERE c1.table_name = :tableName
          AND c2.table_name != :tableName
          AND c1.column_name NOT IN ('ID', 'CREATED_AT', 'UPDATED_AT', 'CREATED_BY', 'UPDATED_BY')
        GROUP BY c2.table_name
        HAVING COUNT(DISTINCT c1.column_name) >= 2
        ORDER BY shared_count DESC
        FETCH FIRST 20 ROWS ONLY
      `;

      const sharedResult = await connection.execute(
        sharedColumnsQuery,
        [tableNameUpper, tableNameUpper],
        {
          outFormat: 2,
          maxRows: 20,
        }
      );

      const sharedRows = sharedResult.rows as any[];
      
      for (const row of sharedRows) {
        const relatedTable = row.TABLE_NAME;
        const sharedCount = Number(row.SHARED_COUNT);
        
        // Skip if already added
        if (!hints.find(h => h.tableName === relatedTable)) {
          hints.push({
            tableName: relatedTable,
            relationshipType: 'shared_columns',
            confidence: Math.min(0.5 + (sharedCount * 0.1), 0.9),
            description: `Shares ${sharedCount} column name(s)`,
          });
        }
      }

      // Sort by confidence (descending) and limit results
      hints.sort((a, b) => b.confidence - a.confidence);
      const limitedHints = hints.slice(0, maxSuggestions);

      const executionTime = Date.now() - startTime;

      audit('Suggested related tables successfully', {
        tableName: tableNameUpper,
        suggestionCount: limitedHints.length,
        executionTime,
      });

      logger.info('Related tables suggested successfully', {
        tableName: tableNameUpper,
        suggestionCount: limitedHints.length,
        executionTime,
      });

      return {
        success: true,
        data: limitedHints,
      };

    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          logger.error('Error releasing connection', { error: err });
        }
      }
    }

  } catch (err: any) {
    const executionTime = Date.now() - startTime;
    
    logger.error('Suggest related tables failed', {
      error: err.message,
      executionTime,
    });

    return {
      success: false,
      error: err.message || 'Unknown error occurred',
    };
  }
}

/**
 * Extract base name from a table name for pattern matching
 * Examples:
 * - ORDERS -> ORDER
 * - ORDER_ITEMS -> ORDER
 * - CUSTOMER_ACCOUNTS -> CUSTOMER
 */
function extractBaseName(tableName: string): string | null {
  // Remove common suffixes
  const withoutSuffix = tableName
    .replace(/_ITEMS$/, '')
    .replace(/_DETAILS$/, '')
    .replace(/_DATA$/, '')
    .replace(/_INFO$/, '')
    .replace(/S$/, ''); // Remove plural 's'

  // Take first part if underscore-separated
  const parts = withoutSuffix.split('_');
  
  if (parts.length > 0 && parts[0].length >= 3) {
    return parts[0];
  }

  return null;
}
