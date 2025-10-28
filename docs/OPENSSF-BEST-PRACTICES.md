# OpenSSF Best Practices Implementation

This document describes how this project implements the [OpenSSF npm Best Practices Guide](https://github.com/ossf/package-manager-best-practices/blob/main/published/npm.md).

## Overview

The Open Source Security Foundation (OpenSSF) provides best practices for securing the software supply chain. This project implements these recommendations to ensure the security and reliability of the MCP Oracle Database package.

## Implementation Checklist

### ✅ CI Configuration

**Requirement**: Follow the principle of least privilege for CI configuration.

**Implementation**:
- All GitHub Actions workflows use `permissions: read-all` or minimal required permissions
- No workflows have write access to contents by default
- `persist-credentials: false` used in checkout actions
- OpenSSF Scorecard Action installed (`.github/workflows/scorecard.yml`)

**Files**:
- `.github/workflows/ci.yml` - Main CI with read-only permissions
- `.github/workflows/scorecard.yml` - Security scorecard assessment
- `.github/workflows/dependency-review.yml` - PR dependency review

### ✅ Dependency Management - Intake

**Requirement**: Study origin, trustworthiness, and security posture of dependencies.

**Implementation**:
- Documented dependency criteria in `CONTRIBUTING.md`
- Check dependencies on [deps.dev](https://deps.dev) before adding
- Use OpenSSF Scorecard to assess dependency security
- Avoid typosquatting by verifying GitHub repos

**Documentation**: See `CONTRIBUTING.md` - "Dependency Management" section

### ✅ Dependency Management - Declaration

**Requirement**: Use package.json and lockfiles properly.

**Implementation**:
- `package.json` committed with all dependencies declared
- `package-lock.json` committed for reproducible installations
- `.npmrc` configured with security defaults:
  - `save-exact=true` - No semver ranges
  - `audit=true` - Audit on install
  - `audit-level=moderate` - Fail on moderate+ vulnerabilities
  - `engine-strict=true` - Enforce Node version requirements

**Files**:
- `package.json` - Manifest file
- `package-lock.json` - Lockfile (committed)
- `.npmrc` - npm configuration

### ✅ Dependency Management - Reproducible Installation

**Requirement**: Use lockfiles and read-only commands in CI.

**Implementation**:
- `package-lock.json` provides hash pinning with SHA-512 integrity checks
- CI uses `npm ci` (read-only lockfile installation)
- No `npm-shrinkwrap.json` (this is a CLI tool, not a library)
- Lockfile is committed and kept up-to-date

**CI Commands**:
```bash
npm ci              # Read-only install
npm run typecheck   # Type checking
npm run build       # Build
npm audit           # Security audit
```

**Why no npm-shrinkwrap.json?**
- This is a CLI tool meant to be installed globally
- Users install via `npm install -g mcp-oracle-database`
- Shrinkwrap would hinder dependency resolution
- Following library recommendations (not application)

### ✅ Dependency Management - Maintenance

**Requirement**: Update dependencies periodically and monitor vulnerabilities.

**Implementation**:
- **Dependabot** configured (`.github/dependabot.yml`):
  - Weekly updates every Monday
  - Groups all dependencies in one PR
  - Monitors both npm and GitHub Actions
  - Auto-labels with "dependencies" and "security"
- **npm audit** runs in CI on every push/PR
- **Dependency Review Action** checks PRs for new vulnerabilities
- **OpenSSF Scorecard** monitors supply chain weekly

**Files**:
- `.github/dependabot.yml` - Dependabot configuration
- `.github/workflows/ci.yml` - Includes `npm audit`
- `.github/workflows/dependency-review.yml` - PR dependency checks

**Commands**:
```bash
npm audit                    # Check for vulnerabilities
npm audit fix                # Fix vulnerabilities
npm outdated                 # Check for updates
npm update                   # Update dependencies
```

### ✅ Vulnerability Disclosure

**Requirement**: Clear vulnerability disclosure process.

**Implementation**:
- **SECURITY.md** file created with:
  - Private disclosure instructions
  - Response timeline commitments
  - Security contact information
  - CVE/GHSA process documentation
- **GitHub Security Advisories** enabled
- **Private vulnerability reporting** available

**Files**:
- `SECURITY.md` - Security policy and disclosure process

**Process**:
1. Researcher reports via email (private)
2. Team acknowledges within 48 hours
3. Investigation within 5 business days
4. Fix released within 30 days (high severity)
5. CVE requested for significant issues
6. Public disclosure coordinated with researcher

### ✅ Release - Account Security

**Requirement**: Secure npm account with 2FA.

**Implementation**:
- Documentation requires 2FA for npm publishing
- Publishing restricted to authorized maintainers
- Access tokens with minimal scope
- CIDR-scoped tokens for CI/CD (when possible)

**Documentation**: See `SECURITY.md` - "Release" section

### ✅ Release - Signing and Verification

**Requirement**: Sign packages and enable provenance.

**Implementation**:
- **npm provenance** enabled in publish workflow
- Publishes with `--provenance` flag
- Links package to source code and build
- SBOM (Software Bill of Materials) generated
- Package integrity verified on install

**Files**:
- `.github/workflows/publish.yml` - Publish with provenance

**Verification**:
```bash
npm view mcp-oracle-database dist.integrity
npm view mcp-oracle-database dist.signatures
```

### ✅ Release - Publishing

**Requirement**: Automate publishing with security checks.

**Implementation**:
- **Automated Publishing Workflow** (`.github/workflows/publish.yml`):
  - Triggers on GitHub releases
  - Runs security audit before publish
  - Type checks and builds code
  - Verifies package contents
  - Publishes with provenance
  - Generates and uploads SBOM
  - Verifies published package

**Pre-publish Checks**:
```bash
npm run clean       # Clean build artifacts
npm run build       # Compile TypeScript
npm run audit       # Security audit
npm pack --dry-run  # Preview package contents
```

**Publish Command**:
```bash
npm publish --provenance --access public
```

### ✅ Private Packages (N/A)

**Requirement**: Use scopes for private packages to prevent confusion attacks.

**Status**: Not applicable - this is a public package.

**Notes**:
- Package name: `mcp-oracle-database` (no scope needed)
- Published to public npm registry
- No private dependencies

## Additional Security Measures

### Code Quality

- **TypeScript strict mode** enabled
- **ESLint** rules enforced (if configured)
- **Type checking** in CI
- **Code review** required for PRs

### Documentation

- **SECURITY.md** - Vulnerability disclosure
- **CONTRIBUTING.md** - Contribution guidelines with security section
- **README.md** - Security badges and best practices
- **LICENSE** - ISC license

### CI/CD Security

- **Minimal permissions** - Read-only by default
- **No secrets in code** - `.env` files gitignored
- **Dependency pinning** - Lockfile with hashes
- **Automated scanning** - Scorecard, audit, dependency review

### Monitoring

- **OpenSSF Scorecard** - Weekly security assessment
- **Dependabot** - Automated dependency updates
- **npm audit** - Vulnerability scanning
- **GitHub Security Advisories** - CVE notifications

## Compliance Matrix

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Least privilege CI | ✅ | Read-only permissions in workflows |
| Lockfile with hashes | ✅ | package-lock.json committed |
| Read-only install in CI | ✅ | npm ci used |
| Dependency maintenance | ✅ | Dependabot + npm audit |
| Vulnerability disclosure | ✅ | SECURITY.md file |
| 2FA for publishing | ✅ | Documented requirement |
| Package signing | ✅ | npm provenance |
| Automated publishing | ✅ | GitHub Actions workflow |
| Security scanning | ✅ | Scorecard + audit |
| SBOM generation | ✅ | CycloneDX SBOM |

## Scorecard Checks

The OpenSSF Scorecard evaluates projects on multiple security criteria:

### Expected Passing Checks

- ✅ **Binary-Artifacts** - No checked-in binaries
- ✅ **Branch-Protection** - Protected main branch
- ✅ **CI-Tests** - Automated testing in CI
- ✅ **CII-Best-Practices** - Following best practices
- ✅ **Code-Review** - Required reviews on PRs
- ✅ **Dangerous-Workflow** - No dangerous patterns
- ✅ **Dependency-Update-Tool** - Dependabot configured
- ✅ **Fuzzing** - N/A for this project type
- ✅ **License** - ISC license present
- ✅ **Maintained** - Active development
- ✅ **Pinned-Dependencies** - Locked versions
- ✅ **SAST** - CodeQL or similar
- ✅ **Security-Policy** - SECURITY.md present
- ✅ **Signed-Releases** - npm provenance
- ✅ **Token-Permissions** - Minimal in workflows
- ✅ **Vulnerabilities** - No known CVEs

### View Current Score

Visit: https://securityscorecards.dev/viewer/?uri=github.com/tannerpace/mcp-oracle-database

## Resources

### OpenSSF Resources

- [OpenSSF npm Best Practices](https://github.com/ossf/package-manager-best-practices/blob/main/published/npm.md)
- [OpenSSF Scorecard](https://github.com/ossf/scorecard)
- [OpenSSF Best Practices Badge](https://bestpractices.coreinfrastructure.org/)
- [OpenSSF Guides](https://openssf.org/resources/guides/)

### npm Security

- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [npm Audit Documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [npm Provenance](https://docs.npmjs.com/generating-provenance-statements)

### GitHub Security

- [GitHub Security Features](https://docs.github.com/en/code-security)
- [Dependabot](https://docs.github.com/en/code-security/dependabot)
- [Security Advisories](https://docs.github.com/en/code-security/security-advisories)
- [Dependency Review](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review)

## Maintenance

### Regular Tasks

**Weekly** (Automated by Dependabot):
- Review and merge dependency updates
- Check Scorecard results

**Monthly**:
- Review SECURITY.md for accuracy
- Update documentation as needed
- Check for new OpenSSF recommendations

**Per Release**:
- Run full security audit
- Verify provenance attestation
- Update CHANGELOG with security notes
- Generate and publish SBOM

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update all dependencies
npm update

# Audit for vulnerabilities
npm audit

# Fix vulnerabilities (if possible)
npm audit fix

# Update lockfile
npm install

# Commit changes
git add package.json package-lock.json
git commit -m "chore: update dependencies"
```

### Responding to Vulnerabilities

1. **Immediate**: Assess severity and impact
2. **Short-term**: Apply patches or workarounds
3. **Medium-term**: Update dependencies
4. **Long-term**: Consider alternatives if unfixable
5. **Always**: Communicate with users via GHSA

## Questions?

For questions about security practices:
1. Review this document
2. Check [SECURITY.md](./SECURITY.md)
3. Open an issue with `security` label
4. Contact security team (see SECURITY.md)

---

Last Updated: 2025-01-27
OpenSSF Best Practices Version: 1.1
