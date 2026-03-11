---
name: wrangler-mcp
description: Wrangler CLI + Cloudflare MCP integration for Workers deployment and log checking
version: 1.0.0
author: opencode
type: skill
category: development
tags:
  - cloudflare
  - workers
  - wrangler
  - mcp
  - observability
  - logs
  - deployment
---

# Wrangler + Cloudflare MCP Skill

> **Purpose**: Unified interface for Cloudflare Workers deployment (Wrangler CLI) and observability (Cloudflare MCP) with log querying, error detection, and performance metrics.

---

## What I Do

I provide a command-line interface for managing Cloudflare Workers deployments and monitoring. I help you:

- **Deploy Workers** - Execute Wrangler CLI commands for deployment with environment support
- **Query Logs** - Fetch structured logs via Cloudflare MCP observability API
- **Find Errors** - Search for errors and exceptions in Worker logs with filtering
- **Get Metrics** - Retrieve performance metrics (latency, CPU, request counts, error rates)
- **Tail Logs** - Stream live logs for real-time debugging
- **Check Status** - Verify Worker deployment status and version info
- **Validate Setup** - Check Wrangler config and Cloudflare API connection

---

## How to Use Me

### Quick Start

```bash
# Show all available commands
bash .opencode/skills/wrangler-mcp/router.sh help

# Validate your Cloudflare setup
bash .opencode/skills/wrangler-mcp/router.sh validate

# Deploy a Worker
bash .opencode/skills/wrangler-mcp/router.sh deploy
bash .opencode/skills/wrangler-mcp/router.sh deploy production

# Query logs for a Worker
bash .opencode/skills/wrangler-mcp/router.sh logs my-worker
bash .opencode/skills/wrangler-mcp/router.sh logs my-worker --from 1h --limit 50

# Find errors in the last 24 hours
bash .opencode/skills/wrangler-mcp/router.sh errors my-worker 24h

# Get performance metrics
bash .opencode/skills/wrangler-mcp/router.sh metrics my-worker latency
bash .opencode/skills/wrangler-mcp/router.sh metrics my-worker requests

# Check deployment status
bash .opencode/skills/wrangler-mcp/router.sh status my-worker
```

### Command Reference

| Command | Description | Arguments |
|---------|-------------|-----------|
| `deploy [env]` | Deploy Worker using Wrangler | Optional: environment name (production, preview, staging) |
| `logs <worker> [options]` | Query logs via Cloudflare MCP | Worker name, `--from`, `--to`, `--limit`, `--status`, `--json` |
| `errors <worker> [timeframe]` | Find errors in Worker logs | Worker name, optional timeframe (default: 1h) |
| `metrics <worker> [metric]` | Get performance metrics | Worker name, metric type (latency, cpu, requests, errors) |
| `tail <worker>` | Start live log tailing | Worker name |
| `status <worker>` | Check Worker deployment status | Worker name |
| `validate` | Validate Wrangler config and MCP connection | None |
| `help` | Show help message | None |

---

## Examples

### Validate Setup

```bash
$ bash .opencode/skills/wrangler-mcp/router.sh validate

=== Wrangler + Cloudflare MCP Validation ===

✓ Wrangler CLI: Installed (v3.28.0)
✓ Cloudflare API Token: Valid
✓ Account ID: abc123def456
✓ MCP Connection: Ready

All checks passed. Ready to deploy and query logs.
```

### Deploy Worker

```bash
$ bash .opencode/skills/wrangler-mcp/router.sh deploy production

=== Deploying Worker ===

Running: wrangler deploy --env production

✓ Deployment successful
  Worker: my-worker
  Environment: production
  URL: https://my-worker.production.workers.dev
  Version: 42
  Deployed at: 2026-03-08T12:34:56Z
```

### Query Logs

```bash
$ bash .opencode/skills/wrangler-mcp/router.sh logs my-worker --from 1h --limit 10

=== Logs for my-worker (last 1h) ===

[2026-03-08T12:30:15Z] GET /api/users - 200 - 45ms
  requestId: req_abc123
  message: "Successfully fetched 10 users"

[2026-03-08T12:28:42Z] POST /api/data - 201 - 123ms
  requestId: req_def456
  message: "Data created successfully"

[2026-03-08T12:25:10Z] GET /api/health - 200 - 12ms
  requestId: req_ghi789
  message: "Health check passed"

Found 3 requests in the last 1h
```

### Find Errors

```bash
$ bash .opencode/skills/wrangler-mcp/router.sh errors my-worker 24h

=== Errors for my-worker (last 24h) ===

[2026-03-08T08:15:23Z] ERROR - 500 - /api/process
  requestId: req_err001
  error: "TypeError: Cannot read property 'id' of undefined"
  stack: |
    at processRequest (index.js:45:12)
    at handleRequest (index.js:23:8)

[2026-03-08T03:42:11Z] ERROR - 503 - /api/external
  requestId: req_err002
  error: "FetchError: Connection timeout after 30s"

Found 2 errors in the last 24h
Error rate: 1.2% (2/167 requests)
```

### Get Metrics

```bash
$ bash .opencode/skills/wrangler-mcp/router.sh metrics my-worker latency

=== Performance Metrics for my-worker (last 1h) ===

Latency:
  Average: 67ms
  P50: 45ms
  P95: 142ms
  P99: 234ms
  Max: 456ms

Request Count: 1,247
Error Count: 8 (0.64%)
CPU Time: 23.4ms avg
```

### Check Status

```bash
$ bash .opencode/skills/wrangler-mcp/router.sh status my-worker

=== Worker Status: my-worker ===

✓ Deployed
  Current Version: 42
  Environment: production
  Last Deployed: 2026-03-08T12:34:56Z
  URL: https://my-worker.production.workers.dev
  
Bindings:
  - KV: USER_DATA (namespace_id_123)
  - D1: Analytics (database_id_456)
  - Secret: API_KEY (configured)

Health: All checks passing
```

### JSON Output

```bash
$ bash .opencode/skills/wrangler-mcp/router.sh metrics my-worker requests --json

{
  "success": true,
  "data": {
    "worker": "my-worker",
    "timeframe": "last 1h",
    "metrics": {
      "requests": {
        "count": 1247,
        "avg": 20.78,
        "rate": "20.78 req/min"
      },
      "errors": {
        "count": 8,
        "rate": 0.0064,
        "percentage": "0.64%"
      }
    }
  },
  "metadata": {
    "query_time": "2026-03-08T13:00:00Z",
    "source": "cloudflare-workers"
  }
}
```

---

## Architecture

```
.opencode/skills/wrangler-mcp/
├── SKILL.md                          # This documentation file
├── router.sh                         # Bash router entry point
└── scripts/
    └── wrangler-mcp-cli.ts          # TypeScript CLI implementation
```

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User / Agent                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  router.sh                                                   │
│  - Parse command and arguments                               │
│  - Invoke ts-node with wrangler-mcp-cli.ts                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  wrangler-mcp-cli.ts                                         │
│  - Argument parsing                                          │
│  - Command routing                                           │
│  - Output formatting                                         │
└─────────────────────────────────────────────────────────────┘
                    │                   │
        ┌───────────┴──────┐   ┌────────┴──────────┐
        ▼                  ▼   ▼                   ▼
┌──────────────────┐  ┌──────────────────────────────────┐
│  Wrangler CLI    │  │  Cloudflare MCP / API            │
│  (Deployment)    │  │  (Observability)                 │
│                  │  │                                  │
│  - wrangler      │  │  - Workers Logs API              │
│    deploy        │  │  - Analytics Reports             │
│  - wrangler      │  │  - Real-time Tail                │
│    status        │  │  - Metrics Aggregation           │
└──────────────────┘  └──────────────────────────────────┘
```

---

## Authentication Setup

### Required Environment Variables

Create a `.env` file in your project root or set these environment variables:

```bash
# Required: Cloudflare API Token
CLOUDFLARE_API_TOKEN=your_api_token_here

# Required: Cloudflare Account ID
CLOUDFLARE_ACCOUNT_ID=your_account_id_here

# Optional: Custom MCP server path (default: uses Cloudflare API directly)
# MCP_SERVER_PATH=observability.mcp.cloudflare.com

# Optional: Custom Wrangler config path (default: ./wrangler.toml)
# WRANGLER_CONFIG_PATH=./wrangler.toml
```

### Getting Your Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **My Profile** → **API Tokens**
3. Click **Create Token**
4. Select **Edit Cloudflare Workers** template (or create custom)
5. Required permissions:
   - **Workers Scripts** → Edit
   - **Workers Logs** → Read
   - **Account Settings** → Read
6. Copy the token and add it to your `.env` file

### Getting Your Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Your Account ID is shown in the right sidebar on the home page
3. Or navigate to **Workers & Pages** → Select your Worker → Account ID in URL

### Security Best Practices

- ✅ **Never commit** `.env` files to version control
- ✅ **Use environment-specific tokens** for production vs development
- ✅ **Rotate tokens regularly** (every 90 days recommended)
- ✅ **Limit token scopes** to minimum required permissions
- ✅ **Use `.gitignore`** to exclude `.env` files

```bash
# Add to .gitignore
.env
.env.local
.env.*.local
```

---

## Configuration

### Wrangler Configuration

The skill uses your existing `wrangler.toml` configuration. Example:

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
route = "my-worker.example.com/*"
vars = { ENVIRONMENT = "production" }

[env.preview]
vars = { ENVIRONMENT = "preview" }
```

### Log Query Options

| Option | Description | Default |
|--------|-------------|---------|
| `--from` | Start time (e.g., `1h`, `24h`, `2026-03-08T00:00:00Z`) | 1h |
| `--to` | End time (ISO 8601 or `now`) | now |
| `--limit` | Maximum number of log entries | 100 |
| `--status` | Filter by HTTP status code (e.g., `500`, `4xx`) | all |
| `--path` | Filter by request path pattern | all |
| `--json` | Output as JSON | false |

### Metric Types

| Metric | Description | Available Aggregations |
|--------|-------------|----------------------|
| `latency` | Request latency | avg, p50, p95, p99, max |
| `cpu` | CPU execution time | avg, max, total |
| `requests` | Request count | count, rate |
| `errors` | Error count and rate | count, rate, percentage |
| `all` | All metrics combined | all |

---

## Troubleshooting

### "Wrangler CLI not found"

**Problem**: Wrangler is not installed globally or in PATH.

**Solution**:
```bash
# Install Wrangler globally
npm install -g wrangler

# Or use npx
npx wrangler --version
```

### "Cloudflare API token is invalid"

**Problem**: Token is expired, revoked, or incorrectly configured.

**Solution**:
1. Verify token in `.env` file
2. Check token has not expired in Cloudflare Dashboard
3. Ensure token has required permissions (Workers Scripts, Workers Logs)
4. Run `validate` command to test connection

### "No logs found for worker"

**Problem**: Worker has no logs in the specified timeframe, or Workers Logs is not enabled.

**Solution**:
1. Verify Worker name is correct
2. Expand timeframe: `--from 24h`
3. Ensure Workers Logs is enabled in Cloudflare Dashboard
4. Check that Worker is actually receiving traffic

### "Account ID mismatch"

**Problem**: Account ID in `.env` doesn't match the account owning the Worker.

**Solution**:
1. Verify Account ID in Cloudflare Dashboard
2. Update `CLOUDFLARE_ACCOUNT_ID` in `.env`
3. Run `validate` to confirm

### "MCP connection failed"

**Problem**: Cannot connect to Cloudflare MCP server.

**Solution**:
1. Check network connectivity
2. Verify API token is valid
3. Try direct API calls (bypass MCP) with `--direct-api` flag
4. Check Cloudflare status page for outages

### "Permission denied"

**Problem**: API token lacks required permissions.

**Solution**:
1. Go to Cloudflare Dashboard → API Tokens
2. Edit your token
3. Add required permissions:
   - Workers Scripts → Edit
   - Workers Logs → Read
   - Account Settings → Read
4. Save and retry

---

## Integration with Cloudflare MCP

### What is MCP?

**Model Context Protocol (MCP)** is an open protocol for AI-to-system connections. It provides:

- **Standardized Interface** - JSON-RPC 2.0 for tool calls
- **Transport Flexibility** - STDIO (local) or HTTP (remote)
- **Tool Discovery** - Dynamic tool schemas and capabilities
- **Type Safety** - JSON Schema validation for inputs/outputs

### Cloudflare MCP Servers

Cloudflare provides official MCP servers:

| Server | Purpose | Endpoint |
|--------|---------|----------|
| **Observability MCP** | Workers logs, metrics, analytics | `observability.mcp.cloudflare.com` |
| **Bindings MCP** | Worker bindings management | `bindings.mcp.cloudflare.com` |
| **Workers MCP** | Worker deployment and lifecycle | `workers.mcp.cloudflare.com` |

### How This Skill Uses MCP

1. **Log Queries** - MCP tools query Workers Logs API with structured filters
2. **Metrics Aggregation** - MCP calculates percentiles, averages, and rates
3. **Error Detection** - MCP scans logs for error patterns and stack traces
4. **Real-time Tail** - MCP streams logs via persistent connection

### MCP vs Direct API

This skill supports both modes:

| Feature | MCP Mode | Direct API Mode |
|---------|----------|-----------------|
| Log Querying | ✅ Via MCP tools | ✅ Via REST API |
| Metrics | ✅ Aggregated by MCP | ✅ Manual calculation |
| Error Detection | ✅ Pattern matching | ✅ Filter-based |
| Live Tail | ✅ Streaming | ✅ Polling |
| Setup Complexity | Higher (MCP client) | Lower (direct HTTP) |

Use `--direct-api` flag to bypass MCP and use direct API calls.

---

## Key Concepts

### 1. Timeframe Syntax

Timeframes can be specified in multiple formats:

```bash
# Relative time (from now)
--from 1h       # Last 1 hour
--from 24h      # Last 24 hours
--from 7d       # Last 7 days
--from 30m      # Last 30 minutes

# Absolute time (ISO 8601)
--from 2026-03-08T00:00:00Z
--to 2026-03-08T23:59:59Z

# Keywords
--from today    # Since midnight UTC
--from yesterday # Previous 24 hours
--to now        # Current time (default)
```

### 2. Log Levels

Cloudflare Workers logs include these levels:

| Level | Description | Example |
|-------|-------------|---------|
| `INFO` | Informational | "Request processed successfully" |
| `LOG` | Custom console.log() | User-defined messages |
| `WARN` | Warnings | "Deprecated API used" |
| `ERROR` | Errors | "TypeError: undefined is not a function" |

### 3. Error Patterns

The `errors` command detects:

- HTTP 5xx status codes
- Uncaught exceptions
- Thrown errors
- Timeout errors
- Network failures
- Custom error logs

### 4. Metric Calculations

| Metric | Calculation |
|--------|-------------|
| **Error Rate** | `errors / total_requests * 100` |
| **P99 Latency** | 99th percentile of request durations |
| **Request Rate** | `requests / time_window_minutes` |
| **CPU Efficiency** | `cpu_time / wall_time * 100` |

---

## Common Workflows

### Debugging a Production Issue

```bash
# 1. Check for recent errors
bash .opencode/skills/wrangler-mcp/router.sh errors my-worker 1h

# 2. Get detailed logs around the error time
bash .opencode/skills/wrangler-mcp/router.sh logs my-worker --from 2h --status 500

# 3. Check metrics for anomalies
bash .opencode/skills/wrangler-mcp/router.sh metrics my-worker all

# 4. Start live tailing to monitor
bash .opencode/skills/wrangler-mcp/router.sh tail my-worker
```

### Pre-Deployment Checklist

```bash
# 1. Validate setup
bash .opencode/skills/wrangler-mcp/router.sh validate

# 2. Check current status
bash .opencode/skills/wrangler-mcp/router.sh status my-worker

# 3. Deploy to preview first
bash .opencode/skills/wrangler-mcp/router.sh deploy preview

# 4. Verify deployment
bash .opencode/skills/wrangler-mcp/router.sh status my-worker

# 5. Deploy to production
bash .opencode/skills/wrangler-mcp/router.sh deploy production
```

### Performance Analysis

```bash
# 1. Get baseline metrics
bash .opencode/skills/wrangler-mcp/router.sh metrics my-worker latency

# 2. Check error rates
bash .opencode/skills/wrangler-mcp/router.sh metrics my-worker errors

# 3. Analyze slow requests
bash .opencode/skills/wrangler-mcp/router.sh logs my-worker --from 24h --limit 100

# 4. Identify patterns in errors
bash .opencode/skills/wrangler-mcp/router.sh errors my-worker 24h
```

---

## Tips & Best Practices

### 1. Use Environment-Specific Deployments

```bash
# Deploy to preview for testing
bash .opencode/skills/wrangler-mcp/router.sh deploy preview

# After testing, deploy to production
bash .opencode/skills/wrangler-mcp/router.sh deploy production
```

### 2. Set Appropriate Timeframes

```bash
# For debugging: narrow timeframe
bash .opencode/skills/wrangler-mcp/router.sh logs my-worker --from 30m

# For analysis: broader timeframe
bash .opencode/skills/wrangler-mcp/router.sh metrics my-worker all --from 7d
```

### 3. Use JSON for Automation

```bash
# Parse metrics in scripts
bash .opencode/skills/wrangler-mcp/router.sh metrics my-worker requests --json | jq '.data.metrics.requests.count'
```

### 4. Monitor Error Rates

```bash
# Set up regular error checks
bash .opencode/skills/wrangler-mcp/router.sh errors my-worker 1h
```

### 5. Validate Before Deploying

```bash
# Always validate before deployment
bash .opencode/skills/wrangler-mcp/router.sh validate
```

---

## File Locations

| File | Purpose |
|------|---------|
| `.opencode/skills/wrangler-mcp/SKILL.md` | This documentation |
| `.opencode/skills/wrangler-mcp/router.sh` | Bash router entry point |
| `.opencode/skills/wrangler-mcp/scripts/wrangler-mcp-cli.ts` | TypeScript CLI implementation |
| `.env` | Environment variables (API tokens) |
| `wrangler.toml` | Wrangler configuration (project root) |

---

## Related Resources

- **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler/
- **Workers Logs**: https://developers.cloudflare.com/workers/observability/logs/
- **Workers Analytics**: https://developers.cloudflare.com/workers/observability/analytics/
- **MCP Protocol**: https://modelcontextprotocol.io/
- **Cloudflare MCP Servers**: https://github.com/cloudflare/mcp-servers

---

**Wrangler + Cloudflare MCP Skill** - Deploy, monitor, and debug your Cloudflare Workers with ease!
