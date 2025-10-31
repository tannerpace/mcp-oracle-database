# MCP Generator Examples

Ready-to-use prompts for common MCP server scenarios. Just copy, customize, and paste to your AI assistant.

## 📚 Important: Always Fetch Latest Documentation

**Before using these examples, instruct your AI assistant to fetch:**
- MCP Specification: https://spec.modelcontextprotocol.io/
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- MCP Servers Examples: https://github.com/modelcontextprotocol/servers

These examples provide quick templates but the official documentation is the source of truth.

---

## 🗄️ Example 1: PostgreSQL MCP Server

**Use Case:** Query PostgreSQL databases with AI assistance

**Copy this prompt:**

```
Create a standalone MCP server for PostgreSQL databases on macOS.

BEFORE STARTING: Fetch and review latest MCP documentation:
- https://spec.modelcontextprotocol.io/
- https://github.com/modelcontextprotocol/typescript-sdk

PROJECT SETUP:
- Directory: ~/projects/mcp-postgresql
- Please instruct me to create this directory if it doesn't exist

PROJECT DETAILS:
- Name: mcp-postgresql-server
- Purpose: Enable AI assistants to query PostgreSQL databases
- Data Source: PostgreSQL database via pg library

TOOLS TO CREATE:
1. query_database - Execute SELECT queries with timeout and row limits
2. get_database_schema - List tables or get column info for specific table
3. explain_query - Get PostgreSQL EXPLAIN plan for optimization

ARCHITECTURE:
Follow MCP best practices with:
- src/database/postgresConnection.ts - Connection pool management
- src/database/queryExecutor.ts - Query execution with safety limits
- src/tools/ - Three tools above
- src/server.ts - Main MCP server with stdio transport
- src/client.ts - Test client
- src/config.ts - Zod-validated environment config
- Environment config for: PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD
- Connection pooling (min 2, max 10)
- Query timeout: 30 seconds
- Max rows: 1000
- TypeScript ES2022 modules (.js imports)
- MCP-compliant response format

DEPENDENCIES:
- @modelcontextprotocol/sdk@^1.20.2
- pg@^8.11.0
- @types/pg@^8.10.0
- zod@^3.25.76
- dotenv@^16.3.1
- typescript@^5.3.3

Generate complete project structure and provide initialization commands for macOS terminal.
```

---

## 🐙 Example 2: GitHub MCP Server

**Use Case:** Interact with GitHub repositories and issues

**Copy this prompt:**

```
Create a standalone MCP server for GitHub API integration on macOS/VS Code.

BEFORE STARTING: Fetch and review latest MCP documentation:
- https://spec.modelcontextprotocol.io/
- https://github.com/modelcontextprotocol/typescript-sdk

PROJECT SETUP:
- Directory: ~/projects/mcp-github
- Please instruct me to create this directory if it doesn't exist

PROJECT DETAILS:
- Name: mcp-github-server
- Purpose: Query GitHub repositories, issues, and pull requests via AI
- Data Source: GitHub REST API v3 via Octokit

TOOLS TO CREATE:
1. search_repositories - Search repos by query, language, stars
2. get_repository_info - Get details about a specific repository
3. list_issues - List issues for a repository with filters
4. get_pull_request - Get PR details including reviews and status

ARCHITECTURE:
Follow MCP best practices with:
- src/server.ts - Main MCP server with stdio transport
- src/client.ts - Test client
- src/config.ts - Zod-validated environment config
- src/github/client.ts - Octokit client singleton
- src/github/types.ts - GitHub API types
- src/tools/ - Four tools above
- Environment config for: GITHUB_TOKEN, GITHUB_API_URL
- Rate limiting: 60 requests/minute
- Request timeout: 10 seconds
- TypeScript ES2022 modules (.js imports)
- MCP-compliant response format

DEPENDENCIES:
- @modelcontextprotocol/sdk@^1.20.2
- @octokit/rest@^20.0.0
- zod@^3.25.76
- dotenv@^16.3.1
- typescript@^5.3.3

Generate complete project structure and provide initialization commands for macOS terminal.
```

---

## 📁 Example 3: File System MCP Server

**Use Case:** Search and analyze local files

**Copy this prompt:**

```
Create a standalone MCP server for file system operations on macOS.

BEFORE STARTING: Fetch and review latest MCP documentation:
- https://spec.modelcontextprotocol.io/
- https://github.com/modelcontextprotocol/typescript-sdk

PROJECT SETUP:
- Directory: ~/projects/mcp-filesystem
- Please instruct me to create this directory if it doesn't exist

PROJECT DETAILS:
- Name: mcp-filesystem-server
- Purpose: Search, read, and analyze files on local system
- Data Source: macOS file system via Node.js fs API

TOOLS TO CREATE:
1. search_files - Search files by name pattern in directory (recursive option)
2. read_file - Read file contents with encoding options
3. get_file_stats - Get file metadata (size, dates, permissions)
4. search_content - Grep-like search within files

ARCHITECTURE:
Follow MCP best practices with:
- src/server.ts - Main MCP server with stdio transport
- src/client.ts - Test client
- src/config.ts - Zod-validated environment config
- src/filesystem/operations.ts - Core file operations
- src/filesystem/types.ts - File system types
- src/tools/ - Four tools above
- Environment config for: ALLOWED_DIRECTORIES (security), MAX_FILE_SIZE
- Security: Only access allowed directories
- Max file size: 10MB
- Search depth limit: 5 levels
- TypeScript ES2022 modules (.js imports)
- MCP-compliant response format

DEPENDENCIES:
- @modelcontextprotocol/sdk@^1.20.2
- zod@^3.25.76
- dotenv@^16.3.1
- typescript@^5.3.3
- glob@^10.3.0

Generate complete project structure with security considerations and provide initialization commands for macOS terminal.
```

---

## 🔔 Example 4: Slack MCP Server

**Use Case:** Send messages and query Slack workspaces

**Copy this prompt:**

```
Create a standalone MCP server for Slack integration on macOS/VS Code.

BEFORE STARTING: Fetch and review latest MCP documentation:
- https://spec.modelcontextprotocol.io/
- https://github.com/modelcontextprotocol/typescript-sdk

PROJECT SETUP:
- Directory: ~/projects/mcp-slack
- Please instruct me to create this directory if it doesn't exist

PROJECT DETAILS:
- Name: mcp-slack-server
- Purpose: Send messages and query Slack channels via AI
- Data Source: Slack Web API via @slack/web-api

TOOLS TO CREATE:
1. send_message - Post message to channel or user
2. list_channels - List all channels in workspace
3. search_messages - Search messages by query and filters
4. get_user_info - Get user profile information

ARCHITECTURE:
Follow MCP best practices with:
- src/server.ts - Main MCP server with stdio transport
- src/client.ts - Test client
- src/config.ts - Zod-validated environment config
- src/slack/client.ts - WebClient singleton
- src/slack/types.ts - Slack API types
- src/tools/ - Four tools above
- Environment config for: SLACK_TOKEN, SLACK_WORKSPACE_ID
- Rate limiting: 1 request per second
- Message length limit: 4000 characters
- TypeScript ES2022 modules (.js imports)
- MCP-compliant response format

DEPENDENCIES:
- @modelcontextprotocol/sdk@^1.20.2
- @slack/web-api@^6.11.0
- zod@^3.25.76
- dotenv@^16.3.1
- typescript@^5.3.3

Generate complete project structure and provide initialization commands for macOS terminal.
```

---

## 📊 Example 5: MongoDB MCP Server

**Use Case:** Query MongoDB collections

**Copy this prompt:**

```
Create a standalone MCP server for MongoDB databases on macOS.

BEFORE STARTING: Fetch and review latest MCP documentation:
- https://spec.modelcontextprotocol.io/
- https://github.com/modelcontextprotocol/typescript-sdk

PROJECT SETUP:
- Directory: ~/projects/mcp-mongodb
- Please instruct me to create this directory if it doesn't exist

PROJECT DETAILS:
- Name: mcp-mongodb-server
- Purpose: Query MongoDB collections via AI assistance
- Data Source: MongoDB via official mongodb driver

TOOLS TO CREATE:
1. query_collection - Find documents with MongoDB query syntax
2. get_schema - Infer schema from collection samples
3. aggregate - Run aggregation pipelines
4. list_collections - List all collections in database

ARCHITECTURE:
Follow MCP best practices with:
- src/server.ts - Main MCP server with stdio transport
- src/client.ts - Test client
- src/config.ts - Zod-validated environment config
- src/database/mongoConnection.ts - MongoClient connection manager
- src/database/queryExecutor.ts - Query execution with limits
- src/tools/ - Four tools above
- Environment config for: MONGO_URI, MONGO_DATABASE
- Connection pooling
- Query timeout: 30 seconds
- Max documents: 1000
- TypeScript ES2022 modules (.js imports)
- MCP-compliant response format

DEPENDENCIES:
- @modelcontextprotocol/sdk@^1.20.2
- mongodb@^6.3.0
- zod@^3.25.76
- dotenv@^16.3.1
- typescript@^5.3.3

Generate complete project structure and provide initialization commands for macOS terminal.
```

---

## 🌐 Example 6: REST API MCP Server

**Use Case:** Generic REST API wrapper

**Copy this prompt:**

```
Create a standalone MCP server for generic REST API integration on macOS.

BEFORE STARTING: Fetch and review latest MCP documentation:
- https://spec.modelcontextprotocol.io/
- https://github.com/modelcontextprotocol/typescript-sdk

PROJECT SETUP:
- Directory: ~/projects/mcp-rest-api
- Please instruct me to create this directory if it doesn't exist

PROJECT DETAILS:
- Name: mcp-rest-api-server
- Purpose: Make HTTP requests to any REST API via AI
- Data Source: HTTP/HTTPS endpoints via axios

TOOLS TO CREATE:
1. http_get - Make GET request with headers and query params
2. http_post - Make POST request with body and headers
3. http_put - Make PUT request for updates
4. http_delete - Make DELETE request

ARCHITECTURE:
Follow MCP best practices with:
- src/server.ts - Main MCP server with stdio transport
- src/client.ts - Test client
- src/config.ts - Zod-validated environment config
- src/api/client.ts - Axios instance with interceptors
- src/api/types.ts - HTTP types
- src/tools/ - Four tools above
- Environment config for: API_BASE_URL, API_KEY, API_TIMEOUT
- Request timeout: 30 seconds
- Response size limit: 5MB
- Support for JSON and form data
- TypeScript ES2022 modules (.js imports)
- MCP-compliant response format

DEPENDENCIES:
- @modelcontextprotocol/sdk@^1.20.2
- axios@^1.6.0
- zod@^3.25.76
- dotenv@^16.3.1
- typescript@^5.3.3

Generate complete project structure and provide initialization commands for macOS terminal.
```

---

## 📈 Example 7: Analytics/Metrics MCP Server

**Use Case:** Query application metrics and logs

**Copy this prompt:**

```
Create a standalone MCP server for application analytics on macOS.

BEFORE STARTING: Fetch and review latest MCP documentation:
- https://spec.modelcontextprotocol.io/
- https://github.com/modelcontextprotocol/typescript-sdk

PROJECT SETUP:
- Directory: ~/projects/mcp-analytics
- Please instruct me to create this directory if it doesn't exist

PROJECT DETAILS:
- Name: mcp-analytics-server
- Purpose: Query and analyze application metrics and logs
- Data Source: Log files and metrics databases (InfluxDB or similar)

TOOLS TO CREATE:
1. query_metrics - Query time-series metrics with aggregations
2. search_logs - Search application logs by level, timestamp, message
3. get_error_stats - Aggregate error statistics
4. analyze_performance - Get performance metrics for time range

ARCHITECTURE:
Follow MCP best practices with:
- src/server.ts - Main MCP server with stdio transport
- src/client.ts - Test client
- src/config.ts - Zod-validated environment config
- src/analytics/client.ts - Metrics database client
- src/analytics/logParser.ts - Log parsing utilities
- src/tools/ - Four tools above
- Environment config for: METRICS_URL, LOGS_DIR, RETENTION_DAYS
- Query timeout: 60 seconds
- Max metrics points: 10000
- TypeScript ES2022 modules (.js imports)
- MCP-compliant response format

DEPENDENCIES:
- @modelcontextprotocol/sdk@^1.20.2
- @influxdata/influxdb-client@^1.33.0 (or similar)
- zod@^3.25.76
- dotenv@^16.3.1
- typescript@^5.3.3

Generate complete project structure and provide initialization commands for macOS terminal.
```

---

## 🛠️ Customization Template

Use this template for your own custom MCP server:

```
Create a standalone MCP server for [YOUR USE CASE] on macOS/VS Code.

BEFORE STARTING: Fetch and review latest MCP documentation:
- https://spec.modelcontextprotocol.io/
- https://github.com/modelcontextprotocol/typescript-sdk

PROJECT SETUP:
- Directory: ~/projects/mcp-[name]
- Please instruct me to create this directory if it doesn't exist

PROJECT DETAILS:
- Name: mcp-[name]-server
- Purpose: [What it does]
- Data Source: [Database/API/Service]

TOOLS TO CREATE:
1. [tool1_name] - [description]
2. [tool2_name] - [description]
3. [tool3_name] - [description]

ARCHITECTURE:
Follow MCP best practices with:
- src/server.ts - Main MCP server with stdio transport
- src/client.ts - Test client
- src/config.ts - Zod-validated environment config
- src/[datasource]/[connection-file].ts - [Description]
- src/[datasource]/types.ts - Type definitions
- src/tools/ - Tool implementations
- Environment config for: [LIST_ENV_VARS]
- TypeScript ES2022 modules (.js imports)
- MCP-compliant response format
- [Any special considerations: timeouts, limits, pooling]

DEPENDENCIES:
- @modelcontextprotocol/sdk@^1.20.2
- [your specific client library]
- zod@^3.25.76
- dotenv@^16.3.1
- typescript@^5.3.3

Generate complete project structure and provide initialization commands for macOS terminal.
```

---

## 💡 Tips for Best Results

1. **Be specific** about your data source and operations
2. **List exact tools** you want to create (2-4 is ideal to start)
3. **Include environment variables** needed for your service
4. **Mention any special requirements** (rate limits, security, etc.)
5. **Specify initialization directory** for macOS
6. **Request initialization commands** to be included

## 🔗 Related Files

- **Detailed Guide:** See `MCP-PROJECT-GENERATOR-PROMPT.md`
- **Quick Start:** See `QUICK-START-GENERATOR.md`
- **Official MCP Docs:** https://modelcontextprotocol.io/
- **MCP Specification:** https://spec.modelcontextprotocol.io/
- **MCP TypeScript SDK:** https://github.com/modelcontextprotocol/typescript-sdk

---

**Ready to build? Copy one of the examples above and start generating! 🚀**
