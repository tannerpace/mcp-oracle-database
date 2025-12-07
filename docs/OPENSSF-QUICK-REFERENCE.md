# OpenSSF Best Practices Quick Reference

This is a quick reference guide for maintaining OpenSSF best practices in this project.

## Daily/Per-Commit Tasks

### Before Committing Code

```bash
# Type check your code
npm run typecheck

# Build the project
npm run build

# Check for security vulnerabilities
npm audit
```

### Never Commit

- ❌ `.env` files with credentials
- ❌ `node_modules/` directory
- ❌ Secrets, API keys, passwords
- ❌ Database credentials
- ❌ Personal access tokens

## Weekly Tasks

### Review Dependabot PRs

1. Check GitHub for Dependabot pull requests
2. Review the changes (usually dependency updates)
3. Ensure CI passes
4. Merge if everything looks good

### Check Security Scorecard

1. Visit: https://securityscorecards.dev/viewer/?uri=github.com/tannerpace/mcp-oracle-database
2. Review score and any new recommendations
3. Address any failing checks

## Monthly Tasks

### Security Review

```bash
# Check for outdated dependencies
npm outdated

# Run comprehensive audit
npm audit

# Update dependencies if needed
npm update
```

### Documentation Review

- Review and update SECURITY.md if needed
- Check that CONTRIBUTING.md is current
- Update README.md security section

## Release Tasks

### Before Publishing

```bash
# Clean and rebuild
npm run clean
npm run build

# Run security audit
npm run audit

# Preview what will be published
npm pack --dry-run

# Verify package contents
tar -tzf mcp-oracle-database-*.tgz
```

### Publishing

Use the GitHub Actions workflow:

1. Create a new release on GitHub
2. Workflow will automatically:
   - Build and test
   - Run security audit
   - Publish with provenance
   - Generate SBOM
   - Verify published package

Or manually (not recommended):

```bash
# Login to npm (with 2FA)
npm login

# Publish with provenance
npm publish --provenance --access public
```

### After Publishing

```bash
# Verify package
npm view mcp-oracle-database dist.integrity
npm view mcp-oracle-database dist.signatures

# Test installation
npm install -g mcp-oracle-database
mcp-database-server --help
```

## Security Incident Response

### If a Vulnerability is Reported

1. **Acknowledge** - Respond within 48 hours
2. **Assess** - Determine severity and impact
3. **Fix** - Create patch in private
4. **Test** - Verify fix thoroughly
5. **Release** - Publish patched version
6. **Disclose** - Create GHSA and notify users
7. **Document** - Update SECURITY.md if needed

### If Dependabot Finds a Vulnerability

1. Check the Dependabot alert details
2. Review the suggested fix
3. Test the update locally
4. Merge the Dependabot PR
5. Release new version if needed

## CI/CD Workflows

### CI Workflow (ci.yml)

**Triggers**: Push to main/develop, PRs
**Tests**: Multiple Node versions (18, 20, 22)
**Checks**: Type check, build, npm audit

### Scorecard Workflow (scorecard.yml)

**Triggers**: Weekly (Mondays), push to main
**Purpose**: Security supply chain assessment
**Output**: SARIF results uploaded to GitHub

### Dependency Review (dependency-review.yml)

**Triggers**: Pull requests
**Purpose**: Check new dependencies for vulnerabilities
**Action**: Blocks PRs with vulnerable dependencies

### Publish Workflow (publish.yml)

**Triggers**: GitHub releases, manual
**Purpose**: Automated secure publishing
**Features**: Provenance, SBOM, verification

## Environment Variables

### Development (.env)

Required for local development:

```env
ORACLE_CONNECTION_STRING=hostname:1521/servicename
ORACLE_USER=readonly_user
ORACLE_PASSWORD=secure_password
ORACLE_POOL_MIN=2
ORACLE_POOL_MAX=10
QUERY_TIMEOUT_MS=30000
MAX_ROWS_PER_QUERY=1000
```

### CI/CD (GitHub Secrets)

Required GitHub secrets:

- `NPM_TOKEN` - npm authentication token with publish permissions
  - Create at: https://www.npmjs.com/settings/~/tokens
  - Type: Automation token (or Publish token)
  - Scope: Publish access
  - Add to: GitHub repository secrets

## Quick Links

### Documentation

- [Full OpenSSF Implementation](./OPENSSF-BEST-PRACTICES.md)
- [Security Policy](../SECURITY.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [README](../README.md)

### External Resources

- [OpenSSF Scorecard](https://securityscorecards.dev/viewer/?uri=github.com/tannerpace/mcp-oracle-database)
- [npm Package](https://www.npmjs.com/package/mcp-oracle-database)
- [GitHub Repository](https://github.com/tannerpace/mcp-oracle-database)
- [OpenSSF npm Guide](https://github.com/ossf/package-manager-best-practices/blob/main/published/npm.md)

### Tools

- [deps.dev](https://deps.dev) - Dependency insights
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Vulnerability scanning
- [Dependabot](https://github.com/dependabot) - Automated updates

## Common Commands

```bash
# Development
npm install          # Install dependencies
npm run dev          # Watch mode
npm run build        # Build project
npm run typecheck    # Type check only

# Testing
npm run test-client  # Run test client

# Security
npm audit            # Check vulnerabilities
npm audit fix        # Fix vulnerabilities
npm outdated         # Check for updates
npm update           # Update dependencies

# Publishing
npm pack --dry-run   # Preview package
npm publish          # Publish (use workflow instead)

# Cleanup
npm run clean        # Remove dist/
rm -rf node_modules  # Remove dependencies
npm install          # Reinstall clean
```

## Checklist for New Contributors

When reviewing PRs, ensure:

- [ ] No secrets or credentials committed
- [ ] Dependencies checked for vulnerabilities
- [ ] CI passes all checks
- [ ] Code follows TypeScript guidelines
- [ ] SQL follows SQL guidelines
- [ ] Documentation updated if needed
- [ ] Security implications considered
- [ ] Lockfile updated if dependencies changed

## Emergency Contacts

For security issues:
- Use GitHub's private vulnerability reporting
- GitHub Security Advisories: https://github.com/tannerpace/mcp-oracle-database/security/advisories

For questions:
- Open an issue: https://github.com/tannerpace/mcp-oracle-database/issues
- Discussions: https://github.com/tannerpace/mcp-oracle-database/discussions

---

**Remember**: Security is everyone's responsibility. When in doubt, ask!
