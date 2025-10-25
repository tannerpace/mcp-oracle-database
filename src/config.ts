import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  ORACLE_CONNECTION_STRING: z.string().optional(),
  ORACLE_USER: z.string().optional(),
  ORACLE_PASSWORD: z.string().optional(),
  ORACLE_POOL_MIN: z.coerce.number().int().min(1).default(2),
  ORACLE_POOL_MAX: z.coerce.number().int().min(1).default(10),
  QUERY_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30000),
  MAX_ROWS_PER_QUERY: z.coerce.number().int().min(1).default(1000),
  MAX_QUERY_LENGTH: z.coerce.number().int().min(1).default(50000),
  LOG_LEVEL: z.string().default('info'),
  ENABLE_AUDIT_LOGGING: z.coerce.boolean().default(true),
  MCP_TRANSPORT: z.string().default('stdio'),
  SERVER_NAME: z.string().default('oracle-mcp-server'),
  SERVER_VERSION: z.string().default('1.0.0'),
});

export type Config = z.infer<typeof configSchema>;

let cached: Config | null = null;

export function getConfig(): Config {
  if (cached) return cached;
  const parsed = configSchema.parse(process.env);
  cached = parsed;
  return parsed;
}

export default getConfig;
