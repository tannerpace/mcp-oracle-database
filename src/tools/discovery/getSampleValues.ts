import { z } from 'zod';
import { getConnection } from '../../database/oracleConnection.js';
import logger, { audit } from '../../utils/logger.js';
import type { SampleValue } from './types.js';

// Input schema for getSampleValues tool
export const GetSampleValuesSchema = z.object({
  tableName: z.string().min(1, 'Table name is required'),
  columnNames: z.array(z.string()).optional(),
  sampleSize: z.number().int().min(1).max(10).optional().default(3),
});

export type GetSampleValuesInput = z.infer<typeof GetSampleValuesSchema>;

/**
 * Get sample values from table columns (with strict safety limits)
 * 
 * This tool provides:
 * - Sample values for each column (default 3 rows max)
 * - Distinct count (approximate)
 * - Null count
 * 
 * SAFETY: Enforces FETCH FIRST n ROWS ONLY (max 10) to prevent resource exhaustion.
 * Helps LLMs understand data patterns and formats.
 * 
 * @param input - Table name, optional column filter, and sample size
 * @returns Sample values for columns
 */
export async function getSampleValues(input: GetSampleValuesInput): Promise<{
  success: boolean;
  data?: SampleValue[];
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const validated = GetSampleValuesSchema.parse(input);
    const tableNameUpper = validated.tableName.toUpperCase();
    const sampleSize = Math.min(validated.sampleSize || 3, 10); // Enforce max 10

    logger.info('Getting sample values', {
      tableName: tableNameUpper,
      columnNames: validated.columnNames,
      sampleSize,
    });

    let connection;
    
    try {
      connection = await getConnection();

      // First, get column list if not specified
      let columns: string[];
      
      if (validated.columnNames && validated.columnNames.length > 0) {
        columns = validated.columnNames.map(c => c.toUpperCase());
      } else {
        // Get all columns
        const columnQuery = `
          SELECT column_name
          FROM user_tab_columns
          WHERE table_name = :tableName
          ORDER BY column_id
        `;

        const columnResult = await connection.execute(
          columnQuery,
          [tableNameUpper],
          {
            outFormat: 2,
            maxRows: 1000,
          }
        );

        const columnRows = columnResult.rows as any[];
        
        if (columnRows.length === 0) {
          throw new Error(`Table ${validated.tableName} not found or not accessible`);
        }

        columns = columnRows.map(row => row.COLUMN_NAME);
      }

      const sampleValues: SampleValue[] = [];

      // Get sample values for each column
      for (const columnName of columns) {
        // Get sample values (SAFETY: strict row limit)
        const sampleQuery = `
          SELECT ${columnName}
          FROM ${tableNameUpper}
          WHERE ${columnName} IS NOT NULL
          FETCH FIRST ${sampleSize} ROWS ONLY
        `;

        try {
          const sampleResult = await connection.execute(sampleQuery, [], {
            outFormat: 2,
            maxRows: sampleSize,
          });

          const sampleRows = sampleResult.rows as any[];
          const values = sampleRows.map(row => row[columnName]);

          // Get approximate distinct count
          const distinctQuery = `
            SELECT COUNT(DISTINCT ${columnName}) as distinct_count
            FROM ${tableNameUpper}
            FETCH FIRST 1000 ROWS ONLY
          `;

          const distinctResult = await connection.execute(distinctQuery, [], {
            outFormat: 2,
            maxRows: 1,
          });

          const distinctRows = distinctResult.rows as any[];
          const distinctCount = distinctRows.length > 0 
            ? Number(distinctRows[0].DISTINCT_COUNT) 
            : 0;

          // Get null count (limited to first 1000 rows for safety)
          const nullQuery = `
            SELECT COUNT(*) as null_count
            FROM (
              SELECT ${columnName}
              FROM ${tableNameUpper}
              FETCH FIRST 1000 ROWS ONLY
            )
            WHERE ${columnName} IS NULL
          `;

          const nullResult = await connection.execute(nullQuery, [], {
            outFormat: 2,
            maxRows: 1,
          });

          const nullRows = nullResult.rows as any[];
          const nullCount = nullRows.length > 0 
            ? Number(nullRows[0].NULL_COUNT) 
            : 0;

          sampleValues.push({
            columnName,
            sampleValues: values,
            distinctCount,
            nullCount,
          });

        } catch (err: any) {
          logger.warn('Failed to get sample values for column', {
            tableName: tableNameUpper,
            columnName,
            error: err.message,
          });
          
          // Include column with error indicator
          sampleValues.push({
            columnName,
            sampleValues: [`Error: ${err.message}`],
          });
        }
      }

      const executionTime = Date.now() - startTime;

      audit('Retrieved sample values successfully', {
        tableName: tableNameUpper,
        columnCount: sampleValues.length,
        sampleSize,
        executionTime,
      });

      logger.info('Sample values retrieved successfully', {
        tableName: tableNameUpper,
        columnCount: sampleValues.length,
        executionTime,
      });

      return {
        success: true,
        data: sampleValues,
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
    
    logger.error('Get sample values failed', {
      error: err.message,
      executionTime,
    });

    return {
      success: false,
      error: err.message || 'Unknown error occurred',
    };
  }
}
