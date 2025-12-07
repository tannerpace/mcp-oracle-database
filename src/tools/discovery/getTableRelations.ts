import { z } from 'zod';
import { getConnection } from '../../database/oracleConnection.js';
import logger, { audit } from '../../utils/logger.js';
import type { TableRelations, ForeignKeyRelation } from './types.js';
import { schemaCache } from './cache.js';

// Input schema for getTableRelations tool
export const GetTableRelationsSchema = z.object({
  tableName: z.string().min(1, 'Table name is required'),
});

export type GetTableRelationsInput = z.infer<typeof GetTableRelationsSchema>;

/**
 * Get table relationships (foreign keys and references) in LLM-friendly JSON format
 * 
 * This tool provides:
 * - Foreign keys from this table to other tables
 * - Foreign keys from other tables referencing this table
 * - Delete rules (CASCADE, SET NULL, etc.)
 * 
 * Helps LLMs understand table relationships for JOIN queries and data integrity.
 * Results are cached for 5 minutes to improve performance.
 * 
 * @param input - Table name
 * @returns Foreign key relationships
 */
export async function getTableRelations(input: GetTableRelationsInput): Promise<{
  success: boolean;
  data?: TableRelations;
  error?: string;
  cached?: boolean;
}> {
  const startTime = Date.now();
  
  try {
    const validated = GetTableRelationsSchema.parse(input);
    const tableNameUpper = validated.tableName.toUpperCase();
    
    // Check cache first
    const cacheKey = `tableRelations:${tableNameUpper}`;
    const cached = schemaCache.get<TableRelations>(cacheKey);
    
    if (cached) {
      logger.debug('Returning cached table relations', { 
        tableName: tableNameUpper,
      });
      
      return {
        success: true,
        data: cached,
        cached: true,
      };
    }

    logger.info('Getting table relations', {
      tableName: tableNameUpper,
    });

    let connection;
    
    try {
      connection = await getConnection();

      // Get foreign keys FROM this table TO other tables
      const foreignKeysQuery = `
        SELECT 
          c.constraint_name,
          c.table_name as from_table,
          cc.column_name as from_column,
          cc.position,
          rc.table_name as to_table,
          rcc.column_name as to_column,
          c.delete_rule
        FROM user_constraints c
        JOIN user_cons_columns cc ON c.constraint_name = cc.constraint_name
        JOIN user_constraints rc ON c.r_constraint_name = rc.constraint_name
        JOIN user_cons_columns rcc ON rc.constraint_name = rcc.constraint_name 
          AND cc.position = rcc.position
        WHERE c.constraint_type = 'R'
          AND c.table_name = :tableName
        ORDER BY c.constraint_name, cc.position
      `;

      const fkResult = await connection.execute(
        foreignKeysQuery,
        [tableNameUpper],
        {
          outFormat: 2,
          maxRows: 1000,
        }
      );

      const fkRows = fkResult.rows as any[];

      // Group by constraint_name to build foreign key objects
      const fkMap = new Map<string, ForeignKeyRelation>();
      
      for (const row of fkRows) {
        const name = row.CONSTRAINT_NAME;
        
        if (!fkMap.has(name)) {
          fkMap.set(name, {
            constraintName: name,
            fromTable: row.FROM_TABLE,
            fromColumns: [],
            toTable: row.TO_TABLE,
            toColumns: [],
            deleteRule: row.DELETE_RULE || undefined,
          });
        }
        
        const fk = fkMap.get(name)!;
        fk.fromColumns.push(row.FROM_COLUMN);
        fk.toColumns.push(row.TO_COLUMN);
      }

      const foreignKeys = Array.from(fkMap.values());

      // Get foreign keys FROM other tables TO this table (referenced by)
      const referencedByQuery = `
        SELECT 
          c.constraint_name,
          c.table_name as from_table,
          cc.column_name as from_column,
          cc.position,
          rc.table_name as to_table,
          rcc.column_name as to_column,
          c.delete_rule
        FROM user_constraints c
        JOIN user_cons_columns cc ON c.constraint_name = cc.constraint_name
        JOIN user_constraints rc ON c.r_constraint_name = rc.constraint_name
        JOIN user_cons_columns rcc ON rc.constraint_name = rcc.constraint_name 
          AND cc.position = rcc.position
        WHERE c.constraint_type = 'R'
          AND rc.table_name = :tableName
        ORDER BY c.constraint_name, cc.position
      `;

      const refByResult = await connection.execute(
        referencedByQuery,
        [tableNameUpper],
        {
          outFormat: 2,
          maxRows: 1000,
        }
      );

      const refByRows = refByResult.rows as any[];

      // Group by constraint_name
      const refByMap = new Map<string, ForeignKeyRelation>();
      
      for (const row of refByRows) {
        const name = row.CONSTRAINT_NAME;
        
        if (!refByMap.has(name)) {
          refByMap.set(name, {
            constraintName: name,
            fromTable: row.FROM_TABLE,
            fromColumns: [],
            toTable: row.TO_TABLE,
            toColumns: [],
            deleteRule: row.DELETE_RULE || undefined,
          });
        }
        
        const ref = refByMap.get(name)!;
        ref.fromColumns.push(row.FROM_COLUMN);
        ref.toColumns.push(row.TO_COLUMN);
      }

      const referencedBy = Array.from(refByMap.values());

      const executionTime = Date.now() - startTime;

      const result: TableRelations = {
        tableName: tableNameUpper,
        foreignKeys,
        referencedBy,
      };

      // Cache the results
      schemaCache.set(cacheKey, result);

      audit('Retrieved table relations successfully', {
        tableName: tableNameUpper,
        foreignKeyCount: foreignKeys.length,
        referencedByCount: referencedBy.length,
        executionTime,
      });

      logger.info('Table relations retrieved successfully', {
        tableName: tableNameUpper,
        foreignKeyCount: foreignKeys.length,
        referencedByCount: referencedBy.length,
        executionTime,
      });

      return {
        success: true,
        data: result,
        cached: false,
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
    
    logger.error('Get table relations failed', {
      error: err.message,
      executionTime,
    });

    return {
      success: false,
      error: err.message || 'Unknown error occurred',
    };
  }
}
