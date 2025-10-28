import { z } from 'zod';
import { getConnection } from '../../database/oracleConnection.js';
import logger, { audit } from '../../utils/logger.js';
import type { ColumnInfo, ConstraintInfo } from './types.js';
import { schemaCache } from './cache.js';

// Input schema for describeTable tool
export const DescribeTableSchema = z.object({
  tableName: z.string().min(1, 'Table name is required'),
  includeConstraints: z.boolean().optional().default(true),
});

export type DescribeTableInput = z.infer<typeof DescribeTableSchema>;

/**
 * Get detailed column-level metadata for a specific table
 * 
 * This tool provides:
 * - Column names and data types
 * - Nullable constraints
 * - Data length, precision, scale
 * - Default values
 * - Column comments (semantic hints)
 * - Table constraints (primary key, foreign keys, unique, check)
 * 
 * Results are cached for 5 minutes to improve performance.
 * 
 * @param input - Table name and options
 * @returns Column metadata and constraints
 */
export async function describeTable(input: DescribeTableInput): Promise<{
  success: boolean;
  data?: {
    tableName: string;
    columns: ColumnInfo[];
    constraints?: ConstraintInfo[];
  };
  error?: string;
  cached?: boolean;
}> {
  const startTime = Date.now();
  
  try {
    const validated = DescribeTableSchema.parse(input);
    const tableNameUpper = validated.tableName.toUpperCase();
    
    // Check cache first
    const cacheKey = `describeTable:${tableNameUpper}:${validated.includeConstraints}`;
    const cached = schemaCache.get<{
      tableName: string;
      columns: ColumnInfo[];
      constraints?: ConstraintInfo[];
    }>(cacheKey);
    
    if (cached) {
      logger.debug('Returning cached table description', { 
        tableName: tableNameUpper,
      });
      
      return {
        success: true,
        data: cached,
        cached: true,
      };
    }

    logger.info('Describing table', {
      tableName: tableNameUpper,
      includeConstraints: validated.includeConstraints,
    });

    let connection;
    
    try {
      connection = await getConnection();

      // Get column information
      const columnQuery = `
        SELECT 
          c.column_name,
          c.data_type,
          c.nullable,
          c.data_length,
          c.data_precision,
          c.data_scale,
          c.data_default,
          cm.comments
        FROM user_tab_columns c
        LEFT JOIN user_col_comments cm ON c.table_name = cm.table_name 
          AND c.column_name = cm.column_name
        WHERE c.table_name = :tableName
        ORDER BY c.column_id
      `;

      const columnResult = await connection.execute(
        columnQuery,
        [tableNameUpper],
        {
          outFormat: 2, // OBJECT format
          maxRows: 1000,
        }
      );

      const columnRows = columnResult.rows as any[];
      
      if (columnRows.length === 0) {
        throw new Error(`Table ${validated.tableName} not found or not accessible`);
      }

      const columns: ColumnInfo[] = columnRows.map((row) => {
        const col: ColumnInfo = {
          columnName: row.COLUMN_NAME,
          dataType: row.DATA_TYPE,
          nullable: row.NULLABLE === 'Y',
        };

        if (row.DATA_LENGTH != null) {
          col.dataLength = Number(row.DATA_LENGTH);
        }
        if (row.DATA_PRECISION != null) {
          col.dataPrecision = Number(row.DATA_PRECISION);
        }
        if (row.DATA_SCALE != null) {
          col.dataScale = Number(row.DATA_SCALE);
        }
        if (row.DATA_DEFAULT) {
          col.defaultValue = String(row.DATA_DEFAULT).trim();
        }
        if (row.COMMENTS) {
          col.comments = row.COMMENTS;
        }

        return col;
      });

      // Get constraints if requested
      let constraints: ConstraintInfo[] | undefined;
      
      if (validated.includeConstraints) {
        const constraintQuery = `
          SELECT 
            c.constraint_name,
            c.constraint_type,
            c.search_condition,
            c.r_constraint_name,
            cc.column_name,
            cc.position
          FROM user_constraints c
          LEFT JOIN user_cons_columns cc ON c.constraint_name = cc.constraint_name
          WHERE c.table_name = :tableName
          ORDER BY c.constraint_name, cc.position
        `;

        const constraintResult = await connection.execute(
          constraintQuery,
          [tableNameUpper],
          {
            outFormat: 2,
            maxRows: 1000,
          }
        );

        const constraintRows = constraintResult.rows as any[];

        // Group constraints by constraint_name
        const constraintMap = new Map<string, ConstraintInfo>();

        for (const row of constraintRows) {
          const name = row.CONSTRAINT_NAME;
          
          if (!constraintMap.has(name)) {
            const constraint: ConstraintInfo = {
              constraintName: name,
              constraintType: getConstraintTypeName(row.CONSTRAINT_TYPE),
              columns: [],
            };

            if (row.SEARCH_CONDITION) {
              constraint.searchCondition = row.SEARCH_CONDITION;
            }

            constraintMap.set(name, constraint);
          }

          if (row.COLUMN_NAME) {
            constraintMap.get(name)!.columns.push(row.COLUMN_NAME);
          }
        }

        // Get referenced table info for foreign keys
        for (const constraint of constraintMap.values()) {
          if (constraint.constraintType === 'FOREIGN_KEY') {
            const refConstraintName = constraintRows.find(
              r => r.CONSTRAINT_NAME === constraint.constraintName
            )?.R_CONSTRAINT_NAME;

            if (refConstraintName) {
              const refQuery = `
                SELECT 
                  c.table_name,
                  cc.column_name,
                  cc.position
                FROM user_constraints c
                JOIN user_cons_columns cc ON c.constraint_name = cc.constraint_name
                WHERE c.constraint_name = :refConstraintName
                ORDER BY cc.position
              `;

              const refResult = await connection.execute(
                refQuery,
                [refConstraintName],
                { outFormat: 2, maxRows: 100 }
              );

              const refRows = refResult.rows as any[];
              
              if (refRows.length > 0) {
                constraint.refTableName = refRows[0].TABLE_NAME;
                constraint.refColumns = refRows.map(r => r.COLUMN_NAME);
              }
            }
          }
        }

        constraints = Array.from(constraintMap.values());
      }

      const executionTime = Date.now() - startTime;

      const result = {
        tableName: tableNameUpper,
        columns,
        constraints,
      };

      // Cache the results
      schemaCache.set(cacheKey, result);

      audit('Described table successfully', {
        tableName: tableNameUpper,
        columnCount: columns.length,
        constraintCount: constraints?.length || 0,
        executionTime,
      });

      logger.info('Table described successfully', {
        tableName: tableNameUpper,
        columnCount: columns.length,
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
    
    logger.error('Describe table failed', {
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
 * Convert Oracle constraint type code to readable name
 */
function getConstraintTypeName(type: string): string {
  switch (type) {
    case 'P':
      return 'PRIMARY_KEY';
    case 'R':
      return 'FOREIGN_KEY';
    case 'U':
      return 'UNIQUE';
    case 'C':
      return 'CHECK';
    default:
      return type;
  }
}
