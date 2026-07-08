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
