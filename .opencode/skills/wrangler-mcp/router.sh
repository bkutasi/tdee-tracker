#!/bin/bash
#
# Wrangler + Cloudflare MCP Skill Router
#
# Usage: bash router.sh <command> [options]
#
# Commands:
#   deploy [env]        - Deploy Worker using Wrangler
#   logs <worker>       - Query logs via Cloudflare MCP
#   errors <worker>     - Find errors in Worker logs
#   metrics <worker>    - Get performance metrics
#   tail <worker>       - Start live log tailing
#   status <worker>     - Check Worker deployment status
#   validate            - Validate Wrangler config and MCP connection
#   help                - Show this help message
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_SCRIPT="$SCRIPT_DIR/scripts/wrangler-mcp-cli.ts"

# Check if ts-node is available
check_ts_node() {
    if ! command -v ts-node &> /dev/null && ! command -v npx &> /dev/null; then
        echo "Error: ts-node or npx is required but not installed."
        echo "Install with: npm install -g ts-node typescript"
        exit 1
    fi
}

# Run the CLI script with ts-node
run_cli() {
    local cmd="$1"
    shift
    
    if command -v ts-node &> /dev/null; then
        ts-node "$CLI_SCRIPT" "$cmd" "$@"
    else
        npx ts-node "$CLI_SCRIPT" "$cmd" "$@"
    fi
}

# Display help
show_help() {
    cat << 'EOF'

Wrangler + Cloudflare MCP Skill

Usage: bash router.sh <command> [options]

Commands:
  deploy [env]              Deploy Worker using Wrangler
                            env: optional environment (production, preview, staging)
  
  logs <worker> [options]   Query logs via Cloudflare MCP
                            Options:
                              --from <timeframe>   Start time (e.g., 1h, 24h, 7d)
                              --to <time>          End time (ISO 8601 or 'now')
                              --limit <number>     Max log entries (default: 100)
                              --status <code>      Filter by status (e.g., 500, 4xx)
                              --path <pattern>     Filter by request path
                              --json               Output as JSON
  
  errors <worker> [timeframe]  Find errors in Worker logs
                               timeframe: optional (default: 1h)
  
  metrics <worker> [metric]    Get performance metrics
                               metric: latency, cpu, requests, errors, all (default: all)
                               Options:
                                 --from <timeframe>   Timeframe (default: 1h)
                                 --json               Output as JSON
  
  tail <worker>             Start live log tailing
                            Options:
                              --status <code>      Filter by status
                              --path <pattern>     Filter by request path
  
  status <worker>           Check Worker deployment status
                            Options:
                              --json               Output as JSON
  
  validate                  Validate Wrangler config and MCP connection
                            Checks: Wrangler installed, API token valid, connection working
  
  help                      Show this help message

Examples:
  bash router.sh validate
  bash router.sh deploy production
  bash router.sh logs my-worker --from 1h --limit 50
  bash router.sh errors my-worker 24h
  bash router.sh metrics my-worker latency
  bash router.sh tail my-worker
  bash router.sh status my-worker

Environment Variables:
  CLOUDFLARE_API_TOKEN     Required: Cloudflare API token
  CLOUDFLARE_ACCOUNT_ID    Required: Cloudflare account ID
  WRANGLER_CONFIG_PATH     Optional: Path to wrangler.toml (default: ./wrangler.toml)

EOF
}

# Main entry point
main() {
    if [ $# -eq 0 ]; then
        show_help
        exit 1
    fi
    
    COMMAND="$1"
    shift
    
    case "$COMMAND" in
        help|--help|-h)
            show_help
            ;;
        deploy|logs|errors|metrics|tail|status|validate)
            check_ts_node
            run_cli "$COMMAND" "$@"
            ;;
        *)
            echo "Error: Unknown command: $COMMAND"
            echo ""
            echo "Run 'bash router.sh help' for usage information."
            exit 1
            ;;
    esac
}

main "$@"
