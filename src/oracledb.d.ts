declare module 'oracledb' {
  export interface Pool {
    getConnection(): Promise<Connection>;
    close(drainTime?: number): Promise<void>;
  }

  export interface Connection {
    execute(sql: string, binds?: any[], options?: ExecuteOptions): Promise<Result<any>>;
    close(): Promise<void>;
  }

  export interface ExecuteOptions {
    outFormat?: number;
    maxRows?: number;
    extendedMetaData?: boolean;
  }

  export interface Result<T> {
    rows?: T[];
    metaData?: Array<{ name: string }>;
  }

  export interface PoolAttributes {
    connectionString: string;
    user: string;
    password: string;
    poolMin?: number;
    poolMax?: number;
    poolIncrement?: number;
  }

  export function createPool(poolAttrs: PoolAttributes): Promise<Pool>;

  export const OUT_FORMAT_OBJECT: number;
}
