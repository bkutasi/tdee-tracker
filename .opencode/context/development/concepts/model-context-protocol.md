<!-- Context: development/concepts/model-context-protocol | Priority: medium | Version: 1.0 | Updated: 2026-03-11 -->

# Concept: Model Context Protocol (MCP)

**Purpose**: Standardized protocol for AI agents to interact with external tools, data sources, and services through a unified interface.

**Last Updated**: 2026-03-11

---

## Core Idea

MCP provides a JSON-RPC based protocol that allows AI models to discover and use external resources (files, databases, APIs) through standardized "servers" that expose tools, resources, and prompts.

## Key Components

- **MCP Server**: Exposes capabilities (tools, resources, prompts) via JSON-RPC
- **MCP Client**: AI model or agent that connects to servers
- **Tools**: Executable functions the model can call
- **Resources**: Data sources the model can read
- **Prompts**: Pre-defined templates for common tasks

## Architecture

```
AI Model ←→ MCP Client ←→ JSON-RPC ←→ MCP Server ←→ External System
                                           ↓
                                    (Database, API, Files)
```

## Protocol Methods

```json
// Initialize connection
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {}, "resources": {} },
    "clientInfo": { "name": "agent", "version": "1.0" }
  }
}

// List available tools
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}

// Call a tool
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "query_database",
    "arguments": { "query": "SELECT * FROM users" }
  }
}
```

## Use Cases in TDEE Tracker

- **Database Access**: MCP server exposes Supabase queries as tools
- **File Operations**: Read/write context files, configs
- **API Integration**: Call external APIs (nutrition, exercise)
- **Testing**: Run test suites via MCP tools

## Benefits

- **Standardization**: One protocol for all integrations
- **Discoverability**: Models can list available tools dynamically
- **Security**: Servers control access, validate inputs
- **Composability**: Multiple servers can be connected simultaneously

## Implementation Considerations

- **Transport**: Stdio, HTTP, or WebSocket
- **Authentication**: Server-specific (API keys, OAuth, etc.)
- **Error Handling**: Standardized JSON-RPC error codes
- **Versioning**: Protocol version negotiation

**References**:
- `.opencode/` — Context system structure (potential MCP resources)
- `js/sync.js` — Could expose sync operations as MCP tools
- `tests/` — Test runners could be MCP tools

**Related**:
- [guides/creating-skills.md](../guides/creating-skills.md)
- [concepts/supabase-auth.md](supabase-auth.md)
- [../core/standards/navigation.md](../../core/standards/navigation.md)

(End of file - total 86 lines)
