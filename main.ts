import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({
  name: "my-mcp",
  version: "1.0.0"
})

server.tool("query_database",
  "a tool to run read only sql querys in the oracle database"
)