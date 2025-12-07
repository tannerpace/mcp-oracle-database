# Contributing to MCP Oracle Database

Thank you for your interest in contributing to the MCP Oracle Database project! This document provides guidelines for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Security](#security)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow. Please be respectful and constructive in all interactions.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a feature branch from `main`
4. Make your changes
5. Test your changes thoroughly
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js 18.17.0 or higher
- Oracle Database (local Docker recommended for testing)
- npm package manager

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/mcp-oracle-database.git
cd mcp-oracle-database

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# (See README.md for Oracle database setup)

# Build the project
npm run build

# Test with the built-in client
npm run test-client
```

## Making Changes

### Before You Start

1. Check existing issues and pull requests to avoid duplicates
2. For major changes, open an issue first to discuss the proposed changes
3. Ensure your development environment is set up correctly

### Development Workflow

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes
# ... edit code ...

# Type check your code
npm run typecheck

# Build the project
npm run build

# Test your changes
npm run test-client

# Commit your changes
git add .
git commit -m "Description of your changes"

# Push to your fork
git push origin feature/your-feature-name
```

## Security

### Security-First Development

Security is a top priority for this project. When contributing:

1. **Never commit secrets**: Ensure `.env` files and credentials are not committed
2. **Review dependencies**: Check new dependencies for known vulnerabilities
3. **Follow the principle of least privilege**: Database users should be read-only
4. **Validate inputs**: Use Zod schemas for runtime validation
5. **Handle errors securely**: Don't expose sensitive information in error messages

### Security Checklist for Contributors

Before submitting a PR:

- [ ] No credentials or secrets in code or commit history
- [ ] New dependencies scanned with `npm audit`
- [ ] Input validation added for new features
- [ ] Error messages don't leak sensitive data
- [ ] Security implications documented in PR description
- [ ] Tests include security-relevant scenarios

### Reporting Security Vulnerabilities

**Do not** open public issues for security vulnerabilities. Instead, please follow the process outlined in [SECURITY.md](./SECURITY.md).

## Pull Request Process

1. **Update Documentation**: Update README.md or other docs if needed
2. **Follow Coding Standards**: Ensure code follows TypeScript and SQL guidelines (see below)
3. **Add Tests**: If test infrastructure exists, add tests for new features
4. **Update Changelog**: Add a note about your changes (if CHANGELOG.md exists)
5. **Clean Commit History**: Squash commits if needed for a clean history
6. **Write Clear PR Description**: Explain what changes you made and why

### PR Description Template

```markdown
## Description
Brief description of changes

## Motivation
Why is this change needed?

## Changes Made
- List of changes
- Another change

## Testing
How did you test this?

## Security Considerations
Any security implications?

## Checklist
- [ ] Code follows project style guidelines
- [ ] Documentation updated
- [ ] No secrets committed
- [ ] Dependencies checked for vulnerabilities
```

## Coding Standards

### TypeScript Guidelines

Follow the guidelines in `.github/instructions/typescript.instructions.md`:

- Use explicit type annotations
- Prefer `interface` over `type` for object shapes
- Never use `any` - use `unknown` with type guards
- Include `.js` extension in ES module imports
- Use `async/await` over `.then()` chains
- Handle errors with try/catch blocks

Example:

```typescript
import { getConfig } from './config.js';

async function fetchData(id: string): Promise<ResultType> {
  try {
    const result = await executeQuery(query);
    return result;
  } catch (error) {
    logger.error('Query failed', { error });
    throw error;
  }
}
```

### SQL Guidelines

Follow the guidelines in `.github/instructions/sql.instructions.md`:

- SQL keywords in UPPERCASE
- Lowercase for table and column names
- Use meaningful table aliases
- Avoid `SELECT *` - specify columns
- Always limit results with `FETCH FIRST n ROWS ONLY`
- Add WHERE clauses to limit scans

Example:

```sql
SELECT e.employee_id, e.first_name, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.hire_date >= ADD_MONTHS(SYSDATE, -12)
ORDER BY e.hire_date DESC
FETCH FIRST 100 ROWS ONLY
```

### File Organization

```
src/
├── server.ts              # Main MCP server
├── client.ts              # Test client
├── config.ts              # Configuration with Zod
├── database/
│   ├── types.ts           # TypeScript types
│   ├── oracleConnection.ts # Connection pool
│   └── queryExecutor.ts   # Query execution
├── tools/
│   ├── queryDatabase.ts   # query_database tool
│   └── getSchema.ts       # get_database_schema tool
└── logging/
    └── logger.ts          # Winston logger
```

### Code Review Focus Areas

Reviewers will look for:

1. **Security**: No vulnerabilities, proper error handling, input validation
2. **Type Safety**: Proper TypeScript usage, no `any` types
3. **Code Quality**: Clean, readable, well-documented code
4. **Performance**: Efficient database queries, proper resource cleanup
5. **Testing**: Adequate test coverage (if applicable)
6. **Documentation**: Clear comments and updated docs

## Dependency Management

### Adding Dependencies

1. **Research First**: Check the package on [deps.dev](https://deps.dev) for vulnerabilities
2. **Check OpenSSF Score**: Review the [OpenSSF Scorecard](https://securityscorecards.dev/)
3. **Minimal Dependencies**: Only add if truly necessary
4. **Run Security Check**: `npm audit` after adding
5. **Lock Versions**: Commit updated `package-lock.json`

### Updating Dependencies

```bash
# Update a specific package
npm update package-name

# Check for outdated packages
npm outdated

# Run security audit
npm audit

# Fix security issues
npm audit fix
```

## Testing

Currently, the project uses a built-in test client (`src/client.ts`). When adding features:

1. Update `src/client.ts` to test your changes
2. Run `npm run test-client` to verify
3. Document test scenarios in your PR

## Documentation

### Code Comments

- Add JSDoc comments for exported functions
- Include examples in comments
- Document Zod schemas
- Keep comments concise

Example:

```typescript
/**
 * Execute a SQL query against the Oracle database
 * @param query - SQL SELECT statement to execute
 * @param maxRows - Maximum number of rows to return (default: from config)
 * @returns Query results with metadata
 * @example
 * const result = await executeQuery("SELECT * FROM users FETCH FIRST 10 ROWS ONLY");
 */
async function executeQuery(query: string, maxRows?: number): Promise<QueryResult> {
  // implementation
}
```

### README Updates

When adding features, update the README to:

- Document new functionality
- Add usage examples
- Update configuration instructions
- Include troubleshooting tips

## Questions?

If you have questions or need help:

1. Check existing documentation in `/docs` folder
2. Review closed issues and PRs for similar questions
3. Open a new issue with the `question` label
4. Be specific and provide context

## License

By contributing, you agree that your contributions will be licensed under the ISC License.

---

Thank you for contributing to MCP Oracle Database! 🚀
