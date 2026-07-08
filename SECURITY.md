# Security Policy

Thank you for helping keep the MCP Oracle Database server and its ecosystem secure.

## Important Notice

This repository is an **MCP server implementation** that enables AI assistants to execute
read-only SQL queries against Oracle databases. It is intended as a functional integration
tool and reference implementation for connecting MCP-compatible clients to Oracle Database.

While this server enforces read-only access and uses Zod-validated inputs, it is your
responsibility to ensure it is deployed securely in your environment. Do **not** connect
this server to a database user with write privileges.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| Latest (main) | ✅ |
| Older releases | ❌ |

## Reporting a Security Vulnerability

If you discover a security vulnerability in this repository, please report it through the
[GitHub Security Advisory process](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
on this repository.

Please **do not** report security vulnerabilities through public GitHub issues, discussions,
or pull requests.

When reporting, please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Any suggested mitigations or fixes

## Security Fixes

### CWE-89 SQL Injection in `get_database_schema` (fixed in v4.2.0)

The `tableName` argument of the `get_database_schema` tool was previously interpolated
directly into a SQL string literal, enabling UNION-based injection by anyone who could
influence the argument (directly or via prompt injection in agent deployments).

**Remediation (released in v4.2.0):**
- `tableName` is now passed as an Oracle bind variable (`:tableName`) — it is never
  concatenated into the query string.
- A Zod schema refinement and an explicit guard in the handler validate `tableName`
  against the Oracle identifier regex (`/^[A-Z][A-Z0-9_$#]{0,29}$/`) before any
  database interaction occurs.
- `validateOracleIdentifier()` is now a shared utility consumed by both
  `get_database_schema` and the existing `get_sample_values` tool.

**Impact scope:** Any deployment that exposed `get_database_schema` to untrusted or
model-generated input. Confidentiality impact was bounded by the connection's
SELECT privileges; using a least-privilege read-only role limits but did not
previously remove the risk.

---

## Security Best Practices

When deploying this MCP server:

- **Use a read-only database user** — grant only `SELECT` privileges to the Oracle user
- **Never commit `.env` files** — store credentials outside of version control
- **Set query limits** — configure `MAX_ROWS_PER_QUERY` and `QUERY_TIMEOUT_MS` in your environment
- **Restrict network access** — ensure the Oracle database is not publicly reachable
- **Rotate credentials regularly** — update `ORACLE_PASSWORD` on a defined schedule
- **Review audit logs** — all queries are logged; monitor `logs/mcp-server.log` for anomalies

## Scope

Security issues in the following dependencies should be reported to their respective maintainers:

- [node-oracledb](https://github.com/oracle/node-oracledb) — Oracle's official Node.js driver
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk) — MCP TypeScript SDK
- [Zod](https://github.com/colinhacks/zod) — schema validation library
