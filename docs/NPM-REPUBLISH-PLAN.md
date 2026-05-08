# NPM Republishing Plan for mcp-oracle-database

This document outlines the process for republishing the `mcp-oracle-database` package to NPM, fixing the outdated version that was published from the old `my-mcp` repository.

## 📋 Pre-Publishing Checklist

### 1. Code Quality & Documentation
- [x] README.md has been updated with correct project name and URLs
- [x] package.json repository URLs have been corrected
- [ ] All TypeScript code compiles without errors
- [ ] Unit tests pass (if applicable)
- [ ] No sensitive information in code or docs
- [ ] CHANGELOG.md is updated with changes

### 2. Package Configuration
- [x] `package.json` has correct name: `mcp-oracle-database`
- [x] `package.json` has correct repository URL
- [x] `package.json` version number is incremented appropriately
- [x] `files` array includes all necessary files (dist/, README.md, LICENSE)
- [x] `main` points to correct entry: `dist/server.js`
- [x] `bin.mcp-database-server` CLI command is configured
- [x] All dependencies are listed and versions locked

### 3. Build & Distribution
- [ ] Run `npm run build` successfully
- [ ] `dist/` folder generates correctly
- [ ] Test with `npm run test-client` to verify functionality

## 🔄 Publishing Steps

### Step 1: Verify Current NPM Package Status
```bash
npm view mcp-oracle-database
```
This will show:
- Current version published
- Old repository information (from my-mcp)
- Installation stats

### Step 2: Prepare Local Repository
```bash
# Ensure you're on main branch and everything is committed
cd mcp-oracle-database
git status

# Pull latest changes
git pull origin main

# Ensure everything builds
npm run clean
npm run build
```

### Step 3: Update Version Number
Update `package.json` version field. Consider semantic versioning:

**Current version:** 1.0.0 (from old my-mcp)

**Recommended options:**
- **Option A: `1.1.0`** — New features/fixes (MINOR version bump)
  - Use if this version has improvements over the old one
  - Preferred: signals that this is an upgrade
  
- **Option B: `2.0.0`** — Breaking changes (MAJOR version bump)
  - Use if the API or behavior differs significantly
  - More dramatic signal of a fresh release

**Recommendation:** Use `1.1.0` with release notes explicitly stating this is a rebuild with corrected metadata.

```bash
npm version 1.1.0
```

### Step 4: Create/Update CHANGELOG.md
Add entry describing the republish:

```markdown
## [1.1.0] - 2026-05-08

### Changed
- Fixed repository URLs to point to correct GitHub repository (mcp-oracle-database)
- Updated documentation and examples to use correct project name
- Rebuilt and republished to correct outdated package metadata

### Security
- No security changes; all authentication remains read-only

### Previous Version
- Previous v1.0.0 was published from incorrect repository (my-mcp)
- Users should update to this version for correct documentation links and repository references
```

### Step 5: Test Locally Before Publishing
```bash
# Build one final time
npm run build

# Run test client to ensure functionality
npm run test-client

# Optional: Test the package installation locally
npm pack  # Creates mcp-oracle-database-1.1.0.tgz
npm install ./mcp-oracle-database-1.1.0.tgz  # Test in another directory
```

### Step 6: Publish to NPM

#### If already logged in:
```bash
npm publish
```

#### If not logged in:
```bash
npm login
# Enter your npm username, password, and OTP if enabled
npm publish
```

#### Publish with tag (optional but recommended):
```bash
# Publish and mark as latest
npm publish --tag latest

# Or publish as next version (for beta/pre-release)
npm publish --tag next
```

### Step 7: Verify Publication
```bash
# Check the published version
npm view mcp-oracle-database

# Install from NPM to test
npm install mcp-oracle-database
npm run start

# Verify the CLI command works
mcp-database-server --help  # If shell can find it
```

### Step 8: Update Git Tags
```bash
# Create a git tag matching the npm version
git tag -a v1.1.0 -m "Release v1.1.0 - Corrected repository metadata"
git push origin v1.1.0

# Or use npm's tag automatically
npm version 1.1.0  # This tags automatically if configured
git push --tags
```

## 🧪 Post-Publishing Verification

### Immediate After Publishing (5-15 minutes)
```bash
# In a new terminal/directory
npm cache clean --force
npm install mcp-oracle-database@latest

# Verify the package.json came from correct repo
npm view mcp-oracle-database repository.url
# Should show: https://github.com/tannerpace/mcp-oracle-database.git

# Verify homepage
npm view mcp-oracle-database homepage
# Should show: https://github.com/tannerpace/mcp-oracle-database#readme
```

### Testing Installation in Real Scenario
```bash
# Test the installation works
mkdir -p /tmp/mcp-test
cd /tmp/mcp-test
npm init -y
npm install mcp-oracle-database
node_modules/.bin/mcp-database-server --version  # If command exists

# Or with global install
npm install -g mcp-oracle-database@latest
mcp-database-server --help
```

## 📢 Communication Strategy

### 1. Update Documentation Sites
- [ ] Update GitHub repository with prominent note about latest version
- [ ] Ensure all docs link to the correct repository
- [ ] Update any integrations (Claude Desktop, VS Code extensions) that reference this package

### 2. Announce the Update
Options for each platform:

#### GitHub
- Create a release with notes: https://github.com/tannerpace/mcp-oracle-database/releases/new
- Include upgrade instructions for users on old version

#### NPM
- Add notice in package.json `"notice"` field (optional):
```json
"notice": "This is the official mcp-oracle-database package. If you previously installed an outdated version from the my-mcp repository, please upgrade to v1.1.0+"
```

#### Documentation
- Add deprecation notice in old repository (my-mcp) README pointing users here
- Update any integration guides (Claude Desktop, VS Code Copilot)

### 3. Deprecate Old Package (If Applicable)
If the old `my-mcp` package name is still published:
```bash
npm deprecate my-mcp@"<1.0.0" "This package was renamed. Use 'mcp-oracle-database' instead: https://www.npmjs.com/package/mcp-oracle-database"
```

## 🛡️ Preventing Future Issues

### Best Practices
1. **Consistent Naming:** Always use `mcp-oracle-database` in all files and configurations
2. **Repository Sync:** Ensure local git remotes always point to the correct repository
3. **Pre-publish Checks:** Run automated checks before publishing:
   ```bash
   npm run build && npm run typecheck && npm test
   ```
4. **GitHub Actions:** Consider setting up CI/CD to auto-publish on releases

### Version Management Strategy
- Use semantic versioning strictly
- Always update CHANGELOG.md before publishing
- Tag releases in git that match npm versions
- Keep package.json version in sync with git tags

## 🔍 Troubleshooting

### Issue: NPM still shows old repository URL
**Solution:** Wait 5-15 minutes for NPM cache to update, then:
```bash
npm cache clean --force
npm view mcp-oracle-database
```

### Issue: Users still installing old version
**Solution:** 
1. Explicitly tell them to update: `npm install mcp-oracle-database@latest`
2. Add notice to old package's README
3. Consider deprecating old package if it's under your control

### Issue: Package.json not updating in NPM
**Solution:** Ensure `files` array in package.json includes package.json itself (it's usually implicit, but verify)

## ✅ Final Checklist Before Publishing

- [ ] README.md updated with correct project name ✅
- [ ] package.json repository URLs corrected ✅
- [ ] Version number incremented in package.json
- [ ] CHANGELOG.md created/updated
- [ ] Code compiles: `npm run build` succeeds
- [ ] Tests pass: `npm run test-client` succeeds
- [ ] No sensitive information in package
- [ ] All dependencies are current
- [ ] Git repository is clean and on main branch
- [ ] Ready to publish: `npm publish`

## 📚 Additional Resources

- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [NPM Version Management](https://docs.npmjs.com/cli/v8/commands/npm-version)
- [Package.json Reference](https://docs.npmjs.com/cli/v8/configuring-npm/package-json)
