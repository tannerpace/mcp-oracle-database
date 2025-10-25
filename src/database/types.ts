import type oracledb from 'oracledb';

export interface QueryResult {
  rows: Record<string, any>[];
  rowCount: number;
  columns: string[];
  executionTime: number;
}

export interface OraclePoolConfig {
  connectionString: string;
  user: string;
  password: string;
  poolMin: number;
  poolMax: number;
  poolIncrement: number;
}

export type OracleConnection = oracledb.Connection;
export type OraclePool = oracledb.Pool;
