# macOS Setup Guide — Apple Silicon (M1/M2/M3/M4)

This guide walks you through setting up a local Oracle XE 21c database on macOS Apple Silicon and connecting it to the MCP server.

We use **Colima** as the container runtime (lighter than Docker Desktop, works natively on Apple Silicon).

---

## Step 1 — Install Prerequisites

**Homebrew** (skip if already installed):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Node.js v18+** via nvm (recommended):
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload your shell config, then install Node
source ~/.zshrc
nvm install 20
nvm use 20
node --version    # should print v20.x.x
```

Or via Homebrew:
```bash
brew install node
node --version
```

**Colima + Docker CLI**:
```bash
brew install colima docker
```

---

## Step 2 — Start Colima

Colima is a lightweight container runtime for macOS — no Docker Desktop required.

```bash
# Start with enough resources for Oracle XE (needs at least 2GB RAM)
colima start --cpu 2 --memory 4 --disk 30

# Verify Docker is working
docker ps
```

> If you already have Colima running with less memory, run `colima stop` then restart with the flags above.

---

## Step 3 — Pull and Start Oracle XE

Oracle's container registry requires a **free account** before you can pull the image.

1. Create a free account at https://container-registry.oracle.com
2. Log in, navigate to **Database → express**, and click **Accept License Agreement**
3. Log in from your terminal:

```bash
docker login container-registry.oracle.com
# Enter your Oracle account email and password when prompted
```

4. Pull and run Oracle XE 21c:

```bash
docker run -d \
  --name oracle-xe \
  -p 1521:1521 \
  -p 5500:5500 \
  -e ORACLE_PWD=OraclePwd123 \
  container-registry.oracle.com/database/express:latest
```

5. Wait for it to be ready (takes 60–90 seconds on first start):

```bash
# Poll health status — wait for "healthy"
watch -n 5 'docker inspect --format="{{.State.Health.Status}}" oracle-xe'

# Or tail the logs directly
docker logs -f oracle-xe
# Look for: DATABASE IS READY TO USE!
```

Your database is now available at:
- **Connection string:** `localhost:1521/XE`
- **SYSTEM password:** `OraclePwd123`
- **Web UI (EM Express):** http://localhost:5500/em

> **Service name note:** Oracle XE 21c has two service names:
> - `XE` — the container database (CDB), used with the SYSTEM user
> - `XEPDB1` — the pluggable database (PDB), used for regular application users

To start and stop the database later:
```bash
docker start oracle-xe
docker stop oracle-xe
```

---

## Step 4 — Clone and Build the MCP Server

```bash
git clone https://github.com/tannerpace/mcp-oracle-database.git
cd mcp-oracle-database
npm install
npm run build
```

---

## Step 5 — Configure Environment

```bash
cp .env.example .env
```

Edit `.env` for local Oracle XE:

```env
ORACLE_CONNECTION_STRING=localhost:1521/XE
ORACLE_USER=system
ORACLE_PASSWORD=OraclePwd123
ORACLE_TIMEZONE=UTC
```

For production use, create a dedicated read-only user — see [Create a Read-Only User](../README.md#optional-create-a-read-only-user).

---

## Step 6 — Test the Server

```bash
# Core tests: connects to Oracle, queries schema and version
npm run test-client

# Schema discovery tool tests
npm run test-discovery
```

Expected output:
```
✅ All tests completed successfully!

📊 Test Summary:
1. List Tools: ✅
2. List Tables (fast): ✅
3. List Tables (with counts): ✅
4. Describe Table: ✅
5. Get Table Relations: ✅
6. Get Sample Values: ✅
7. Suggest Related Tables: ✅
8. Cache Test: ✅
```

---

## Step 7 — Connect VS Code

Return to the main [README — Configure VS Code](../README.md#-configure-vs-code) section.

---

## Troubleshooting

### Colima not running

```bash
colima status
colima start --cpu 2 --memory 4   # Oracle needs at least 2GB RAM
docker ps                          # verify Docker is available
```

### Oracle container issues

```bash
# Check if container exists
docker ps -a | grep oracle-xe

# View startup logs
docker logs oracle-xe

# Already exists but stopped — just start it
docker start oracle-xe

# Check health status
docker inspect --format='{{.State.Health.Status}}' oracle-xe
# Wait for: healthy
```

### Container registry login required

```
Error: unauthorized: authentication required
```

1. Create a free account at https://container-registry.oracle.com
2. Accept the license for **Database → express**
3. Run `docker login container-registry.oracle.com`
