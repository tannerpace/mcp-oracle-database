# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of the MCP Oracle Database project seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please do the following:

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email your findings to **[tanner@tannerpace.com]** (replace with actual security contact)
3. Include detailed steps to reproduce the vulnerability
4. Allow reasonable time for us to respond before public disclosure

### When reporting, please include:

- Type of vulnerability (e.g., SQL injection, authentication bypass, etc.)
- Full paths of source file(s) related to the vulnerability
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### Preferred Languages

We prefer all communications to be in English.

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
- **Investigation**: We will investigate and confirm the issue within 5 business days
- **Fix Timeline**: We aim to release a fix within 30 days for high-severity issues
- **Credit**: We will credit you in the security advisory (unless you prefer to remain anonymous)
- **Public Disclosure**: We will coordinate with you on the timing of public disclosure

### Security Update Process

1. Security issues will be patched in private
2. A security advisory will be published to GitHub Security Advisories
3. A CVE will be requested for significant vulnerabilities
4. Fixed versions will be released with security notes in the changelog
5. Users will be notified through:
   - GitHub Security Advisories
   - npm security advisories
   - Project README

### Security Best Practices for Users

When using this MCP server:

1. **Use Read-Only Database Users**: Always configure a database user with SELECT-only privileges
2. **Secure Your Credentials**: Never commit `.env` files or credentials to version control
3. **Network Security**: Restrict database access to trusted networks only
4. **Keep Updated**: Regularly update to the latest version to receive security patches
5. **Monitor Logs**: Review audit logs for suspicious query patterns
6. **Configure Limits**: Use appropriate `QUERY_TIMEOUT_MS` and `MAX_ROWS_PER_QUERY` settings

### Known Security Considerations

This project is designed for **local trusted use** with AI assistants like GitHub Copilot:

- The server trusts the LLM/AI to generate valid SQL queries
- No SQL injection protection is implemented (queries come from trusted AI)
- The database user should have READ-ONLY access (SELECT privileges only)
- Query execution is limited by timeout and row count constraints
- All queries are logged for audit purposes

### Third-Party Dependencies

We use automated tools to monitor our dependencies:

- **Dependabot**: Automatic security updates for npm packages
- **npm audit**: Regular vulnerability scanning in CI/CD
- **OpenSSF Scorecard**: Supply chain security assessment

### Additional Resources

- [OpenSSF Best Practices Badge](https://bestpractices.coreinfrastructure.org/)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [Oracle Database Security Guide](https://docs.oracle.com/en/database/oracle/oracle-database/21/dbseg/)

## Security-Related Configuration

### Environment Variables

Sensitive environment variables that should **never** be committed:

- `ORACLE_PASSWORD`: Database password
- `ORACLE_USER`: Database username (if sensitive)
- `ORACLE_CONNECTION_STRING`: May contain sensitive host information

### File Security

Files that should be excluded from version control (already in `.gitignore`):

- `.env` - Contains all secrets
- `logs/` - May contain query data
- `.vscode/mcp.json` - May contain credentials

## Hall of Fame

We appreciate security researchers who responsibly disclose vulnerabilities:

<!-- Security researchers will be listed here -->

---

Thank you for helping keep MCP Oracle Database and our users safe!
