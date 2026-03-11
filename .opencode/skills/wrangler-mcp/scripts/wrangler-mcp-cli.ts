#!/usr/bin/env npx ts-node
/**
 * Wrangler + Cloudflare MCP CLI
 *
 * Unified interface for Cloudflare Workers deployment (Wrangler CLI)
 * and observability (Cloudflare MCP) with log querying, error detection,
 * and performance metrics.
 *
 * Usage: npx ts-node wrangler-mcp-cli.ts <command> [options]
 *
 * Commands:
 *   deploy [env]        - Deploy Worker using Wrangler
 *   logs <worker>       - Query logs via Cloudflare MCP
 *   errors <worker>     - Find errors in Worker logs
 *   metrics <worker>    - Get performance metrics
 *   tail <worker>       - Start live log tailing
 *   status <worker>     - Check Worker deployment status
 *   validate            - Validate Wrangler config and MCP connection
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Types and Interfaces

interface Args {
  command: string;
  worker?: string;
  env?: string;
  timeframe?: string;
  metric?: string;
  from?: string;
  to?: string;
  limit?: number;
  status?: string;
  path?: string;
  json?: boolean;
  directApi?: boolean;
  [key: string]: any;
}

interface CloudflareConfig {
  apiToken: string;
  accountId: string;
  wranglerConfigPath?: string;
}

interface LogEvent {
  timestamp: string;
  level: string;
  message: string;
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  duration?: number;
  error?: string;
  stack?: string;
}

interface Metrics {
  worker: string;
  timeframe: string;
  requests?: {
    count: number;
    avg: number;
    rate: string;
  };
  latency?: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  cpu?: {
    avg: number;
    max: number;
    total: number;
  };
  errors?: {
    count: number;
    rate: number;
    percentage: string;
  };
}

interface WorkerStatus {
  name: string;
  deployed: boolean;
  version?: number;
  environment?: string;
  lastDeployed?: string;
  url?: string;
  bindings?: Array<{
    type: string;
    name: string;
    id?: string;
  }>;
  health?: string;
}

interface CommandResult {
  success: boolean;
  data?: any;
  metadata?: {
    query_time: string;
    source: string;
    [key: string]: any;
  };
  error?: string;
}

// Constants

const DEFAULT_TIMEFRAME = '1h';
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

// Find project root (look for .git or package.json)
function findProjectRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.git')) || fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

const PROJECT_ROOT = findProjectRoot();

// Helper Functions

function loadEnvConfig(): CloudflareConfig {
  // Try to load from .env file first
  const envPath = path.join(PROJECT_ROOT, '.env');
  let envVars: Record<string, string> = {};
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line: string) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    });
  }
  
  // Environment variables take precedence
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || envVars.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || envVars.CLOUDFLARE_ACCOUNT_ID;
  const wranglerConfigPath = process.env.WRANGLER_CONFIG_PATH || envVars.WRANGLER_CONFIG_PATH;
  
  return {
    apiToken: apiToken || '',
    accountId: accountId || '',
    wranglerConfigPath: wranglerConfigPath || './wrangler.toml',
  };
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    command: argv[0] || 'help',
  };
  
  let i = 1;
  while (i < argv.length) {
    const arg = argv[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = argv[i + 1];
      
      if (key === 'json' || key === 'direct-api') {
        args[key === 'json' ? 'json' : 'directApi'] = true;
        i++;
      } else if (nextArg && !nextArg.startsWith('--')) {
        // Parse value
        if (key === 'limit') {
          args[key] = parseInt(nextArg, 10);
        } else {
          args[key] = nextArg;
        }
        i += 2;
      } else {
        args[key] = true;
        i++;
      }
    } else if (!args.worker && !args.command) {
      args.worker = arg;
      i++;
    } else if (!args.timeframe && !args.metric && !args.env) {
      // Could be env, timeframe, or metric depending on command
      if (args.command === 'deploy') {
        args.env = arg;
      } else if (args.command === 'errors') {
        args.timeframe = arg;
      } else if (args.command === 'metrics') {
        args.metric = arg;
      } else if (!args.worker) {
        args.worker = arg;
      }
      i++;
    } else {
      i++;
    }
  }
  
  return args;
}

function formatTimestamp(date: Date): string {
  return date.toISOString();
}

function parseTimeframe(timeframe: string): { from: string; to: string } {
  const now = new Date();
  let fromTime: Date;
  
  // Handle relative timeframes
  const match = timeframe.match(/^(\d+)([mhdw])$/);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    fromTime = new Date(now.getTime());
    switch (unit) {
      case 'm':
        fromTime.setMinutes(fromTime.getMinutes() - value);
        break;
      case 'h':
        fromTime.setHours(fromTime.getHours() - value);
        break;
      case 'd':
        fromTime.setDate(fromTime.getDate() - value);
        break;
      case 'w':
        fromTime.setDate(fromTime.getDate() - value * 7);
        break;
    }
  } else if (timeframe === 'today') {
    fromTime = new Date(now);
    fromTime.setHours(0, 0, 0, 0);
  } else if (timeframe === 'yesterday') {
    fromTime = new Date(now);
    fromTime.setDate(fromTime.getDate() - 1);
    fromTime.setHours(0, 0, 0, 0);
  } else {
    // Assume ISO 8601
    fromTime = new Date(timeframe);
  }
  
  return {
    from: fromTime.toISOString(),
    to: now.toISOString(),
  };
}

// Cloudflare API Client

async function cloudflareApiRequest(
  config: CloudflareConfig,
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}${endpoint}`;
    
    const options: any = {
      method,
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    };
    
    const req = https.request(url, options, (res: any) => {
      let data = '';
      
      res.on('data', (chunk: string) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success) {
            resolve(result.result);
          } else {
            reject(new Error(result.errors?.[0]?.message || 'API request failed'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e}`));
        }
      });
    });
    
    req.on('error', (e: Error) => {
      reject(new Error(`Request failed: ${e.message}`));
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Command Handlers

async function cmdValidate(args: Args): Promise<void> {
  const config = loadEnvConfig();
  const isJson = args.json;
  
  const results: any = {
    wrangler: { installed: false, version: null },
    apiToken: { valid: false, message: '' },
    accountId: { valid: false, message: '' },
    connection: { ready: false, message: '' },
  };
  
  // Check Wrangler installation
  try {
    const wranglerVersion = execSync('wrangler --version', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    results.wrangler.installed = true;
    results.wrangler.version = wranglerVersion;
  } catch (e) {
    results.wrangler.installed = false;
    results.wrangler.message = 'Wrangler CLI not found. Install with: npm install -g wrangler';
  }
  
    // Check API token
  if (!config.apiToken) {
    results.apiToken.valid = false;
    results.apiToken.message = 'CLOUDFLARE_API_TOKEN not set';
  } else {
    results.apiToken.valid = config.apiToken.length > 20;
    results.apiToken.message = results.apiToken.valid ? 'Token format valid' : 'Token appears too short';
  }
  
  // Check Account ID
  if (!config.accountId) {
    results.accountId.valid = false;
    results.accountId.message = 'CLOUDFLARE_ACCOUNT_ID not set';
  } else {
    results.accountId.valid = /^[a-f0-9]{32}$/.test(config.accountId);
    results.accountId.message = results.accountId.valid ? 'Account ID format valid' : 'Account ID should be 32 hex characters';
  }
  
  // Test API connection
  if (results.apiToken.valid && results.accountId.valid) {
    try {
      await cloudflareApiRequest(config, '/workers/scripts', 'GET');
      results.connection.ready = true;
      results.connection.message = 'API connection successful';
    } catch (e: any) {
      results.connection.ready = false;
      results.connection.message = `API connection failed: ${e.message}`;
    }
    outputValidation(results, isJson ?? false);
  } else {
    results.connection.message = 'Cannot test connection: missing credentials';
    outputValidation(results, isJson ?? false);
  }
}

function outputValidation(results: any, isJson: boolean): void {
  if (isJson) {
    const output: CommandResult = {
      success: results.wrangler.installed && results.apiToken.valid && results.accountId.valid && results.connection.ready,
      data: results,
      metadata: {
        query_time: formatTimestamp(new Date()),
        source: 'wrangler-mcp-cli',
      },
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log('\n=== Wrangler + Cloudflare MCP Validation ===\n');
    
    // Wrangler
    if (results.wrangler.installed) {
      console.log(`✓ Wrangler CLI: Installed (${results.wrangler.version})`);
    } else {
      console.log(`✗ Wrangler CLI: Not installed`);
      console.log(`  ${results.wrangler.message}`);
    }
    
    // API Token
    if (results.apiToken.valid) {
      console.log(`✓ Cloudflare API Token: Valid`);
    } else {
      console.log(`✗ Cloudflare API Token: Invalid`);
      console.log(`  ${results.apiToken.message}`);
    }
    
    // Account ID
    if (results.accountId.valid) {
      console.log(`✓ Account ID: ${results.accountId.valid ? loadEnvConfig().accountId.slice(0, 8) + '...' : 'Not configured'}`);
    } else {
      console.log(`✗ Account ID: Invalid`);
      console.log(`  ${results.accountId.message}`);
    }
    
    // Connection
    if (results.connection.ready) {
      console.log(`✓ MCP Connection: Ready`);
    } else {
      console.log(`✗ MCP Connection: Not ready`);
      console.log(`  ${results.connection.message}`);
    }
    
    console.log();
    
    const allPassed = results.wrangler.installed && results.apiToken.valid && results.accountId.valid && results.connection.ready;
    if (allPassed) {
      console.log('All checks passed. Ready to deploy and query logs.');
    } else {
      console.log('Some checks failed. Please fix the issues above.');
      process.exit(1);
    }
  }
}

function cmdDeploy(args: Args): void {
  const config = loadEnvConfig();
  const isJson = args.json;
  const env = args.env;
  
  if (!config.apiToken || !config.accountId) {
    const error: CommandResult = {
      success: false,
      error: 'Missing Cloudflare credentials. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.',
    };
    if (isJson) {
      console.log(JSON.stringify(error, null, 2));
    } else {
      console.log(`Error: ${error.error}`);
    }
    process.exit(1);
  }
  
  const wranglerArgs = ['deploy'];
  if (env) {
    wranglerArgs.push('--env', env);
  }
  
  if (isJson) {
    wranglerArgs.push('--json');
  }
  
  try {
    if (!args.json) {
      console.log('\n=== Deploying Worker ===\n');
      console.log(`Running: wrangler ${wranglerArgs.join(' ')}`);
      console.log();
    }
    
    const output = execSync(`wrangler ${wranglerArgs.join(' ')}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'inherit'],
      env: { ...process.env, CLOUDFLARE_API_TOKEN: config.apiToken, CLOUDFLARE_ACCOUNT_ID: config.accountId },
    });
    
    if (isJson) {
      try {
        const result = JSON.parse(output);
        const successResult: CommandResult = {
          success: true,
          data: result,
          metadata: {
            query_time: formatTimestamp(new Date()),
            source: 'wrangler-cli',
            environment: env || 'production',
          },
        };
        console.log(JSON.stringify(successResult, null, 2));
      } catch (e) {
        console.log(output);
      }
    } else {
      console.log('\n✓ Deployment successful');
      console.log(`  Environment: ${env || 'production'}`);
      console.log(`  Deployed at: ${formatTimestamp(new Date())}`);
    }
  } catch (e: any) {
    const errorResult: CommandResult = {
      success: false,
      error: e.message || 'Deployment failed',
    };
    
    if (isJson) {
      console.log(JSON.stringify(errorResult, null, 2));
    } else {
      console.log(`\n✗ Deployment failed: ${e.message}`);
    }
    process.exit(1);
  }
}

async function cmdLogs(args: Args): Promise<void> {
  const config = loadEnvConfig();
  const worker = args.worker;
  const isJson = args.json;
  const limit = args.limit || DEFAULT_LIMIT;
  const timeframe = args.from || DEFAULT_TIMEFRAME;
  
  if (!worker) {
    const error: CommandResult = {
      success: false,
      error: 'Worker name is required. Usage: logs <worker-name> [options]',
    };
    outputCommandResult(error, isJson ?? false);
    process.exit(1);
  }
  
  if (!config.apiToken || !config.accountId) {
    const error: CommandResult = {
      success: false,
      error: 'Missing Cloudflare credentials. Run validate command first.',
    };
    outputCommandResult(error, isJson ?? false);
    process.exit(1);
  }
  
  try {
    const timeRange = parseTimeframe(timeframe);
    
    const queryBody = {
      queryId: 'workers-logs-events',
      view: 'events',
      limit: Math.min(limit, MAX_LIMIT),
      timeframe: timeRange,
      parameters: {
        datasets: ['cloudflare-workers'],
        filters: [
          {
            key: '$metadata.service',
            operation: 'eq',
            type: 'string',
            value: worker,
          },
        ],
      },
    };
    
    // Add status filter if specified
    if (args.status) {
      queryBody.parameters.filters.push({
        key: '$metadata.status',
        operation: 'eq',
        type: 'number',
        value: parseInt(args.status, 10).toString(),
      });
    }
    
    // Add path filter if specified
    if (args.path) {
      queryBody.parameters.filters.push({
        key: '$metadata.trigger',
        operation: 'starts_with',
        type: 'string',
        value: args.path,
      });
    }
    
    const result = await cloudflareApiRequest(
      config,
      '/workers/analytics/report',
      'POST',
      queryBody
    );
    
    const logs = result?.data || [];
    
    if (isJson) {
      const successResult: CommandResult = {
        success: true,
        data: {
          worker,
          timeframe,
          logs,
          count: logs.length,
        },
        metadata: {
          query_time: formatTimestamp(new Date()),
          source: 'cloudflare-workers',
        },
      };
      console.log(JSON.stringify(successResult, null, 2));
    } else {
      console.log(`\n=== Logs for ${worker} (${timeframe}) ===\n`);
      
      if (logs.length === 0) {
        console.log('No logs found in the specified timeframe.');
      } else {
        logs.forEach((log: any) => {
          const timestamp = log.timestamp || log._timestamp || 'Unknown';
          const method = log.method || '';
          const logPath = log.path || log.url || '';
          const status = log.status || '';
          const duration = log.duration ? `${log.duration}ms` : '';
          const message = log.message || log.error || '';
          const requestId = log.requestId || '';
          
          console.log(`[${timestamp}] ${method} ${logPath} - ${status} - ${duration}`);
          if (message) {
            console.log(`  message: "${message}"`);
          }
          if (requestId) {
            console.log(`  requestId: ${requestId}`);
          }
          console.log();
        });
        
        console.log(`Found ${logs.length} requests in ${timeframe}`);
      }
    }
  } catch (e: any) {
    const errorResult: CommandResult = {
      success: false,
      error: e.message || 'Failed to query logs',
    };
    outputCommandResult(errorResult, isJson ?? false);
    process.exit(1);
  }
}

async function cmdErrors(args: Args): Promise<void> {
  const config = loadEnvConfig();
  const worker = args.worker;
  const isJson = args.json;
  const timeframe = args.timeframe || DEFAULT_TIMEFRAME;
  
  if (!worker) {
    const error: CommandResult = {
      success: false,
      error: 'Worker name is required. Usage: errors <worker-name> [timeframe]',
    };
    outputCommandResult(error, isJson ?? false);
    process.exit(1);
  }
  
  if (!config.apiToken || !config.accountId) {
    const error: CommandResult = {
      success: false,
      error: 'Missing Cloudflare credentials. Run validate command first.',
    };
    outputCommandResult(error, isJson ?? false);
    process.exit(1);
  }
  
  try {
    const timeRange = parseTimeframe(timeframe);
    
    // Query for errors (status >= 500 or error field present)
    const queryBody = {
      queryId: 'workers-errors-events',
      view: 'events',
      limit: 100,
      timeframe: timeRange,
      parameters: {
        datasets: ['cloudflare-workers'],
        filters: [
          {
            key: '$metadata.service',
            operation: 'eq',
            type: 'string',
            value: worker,
          },
          {
            key: '$metadata.status',
            operation: 'gte',
            type: 'number',
            value: 500,
          },
        ],
      },
    };
    
    const result = await cloudflareApiRequest(
      config,
      '/workers/analytics/report',
      'POST',
      queryBody
    );
    
    const errors = result?.data || [];
    
    // Also get total request count for error rate
    const totalQueryBody = {
      queryId: 'workers-count-events',
      view: 'calculations',
      timeframe: timeRange,
      parameters: {
        datasets: ['cloudflare-workers'],
        filters: [
          {
            key: '$metadata.service',
            operation: 'eq',
            type: 'string',
            value: worker,
          },
        ],
        calculations: [
          {
            operator: 'count',
            key: '$metadata.requestId',
          },
        ],
      },
    };
    
    let totalRequests = 0;
    try {
      const totalResult = await cloudflareApiRequest(
        config,
        '/workers/analytics/report',
        'POST',
        totalQueryBody
      );
      totalRequests = totalResult?.data?.[0]?.count || 0;
    } catch (e) {
      // Ignore total count errors
    }
    
    const errorRate = totalRequests > 0 ? (errors.length / totalRequests * 100) : 0;
    
    if (isJson) {
      const successResult: CommandResult = {
        success: true,
        data: {
          worker,
          timeframe,
          errors,
          count: errors.length,
          totalRequests,
          errorRate: errorRate.toFixed(2) + '%',
        },
        metadata: {
          query_time: formatTimestamp(new Date()),
          source: 'cloudflare-workers',
        },
      };
      console.log(JSON.stringify(successResult, null, 2));
    } else {
      console.log(`\n=== Errors for ${worker} (${timeframe}) ===\n`);
      
      if (errors.length === 0) {
        console.log('No errors found in the specified timeframe. Great!');
      } else {
        errors.forEach((err: any, index: number) => {
          const timestamp = err.timestamp || 'Unknown';
          const method = err.method || '';
          const errPath = err.path || err.url || '';
          const status = err.status || '';
          const message = err.error || err.message || '';
          const requestId = err.requestId || '';
          const stack = err.stack || '';
          
          console.log(`[${timestamp}] ERROR - ${status} - ${method} ${errPath}`);
          if (requestId) {
            console.log(`  requestId: ${requestId}`);
          }
          if (message) {
            console.log(`  error: "${message}"`);
          }
          if (stack) {
            console.log(`  stack: |`);
            stack.split('\n').forEach((line: string) => {
              console.log(`    ${line}`);
            });
          }
          console.log();
        });
        
        console.log(`Found ${errors.length} error${errors.length !== 1 ? 's' : ''} in ${timeframe}`);
        if (totalRequests > 0) {
          console.log(`Error rate: ${errorRate.toFixed(1)}% (${errors.length}/${totalRequests} requests)`);
        }
      }
    }
  } catch (e: any) {
    const errorResult: CommandResult = {
      success: false,
      error: e.message || 'Failed to query errors',
    };
    outputCommandResult(errorResult, isJson ?? false);
    process.exit(1);
  }
}

async function cmdMetrics(args: Args): Promise<void> {
  const config = loadEnvConfig();
  const worker = args.worker;
  const isJson = args.json;
  const metricType = args.metric || 'all';
  const timeframe = args.from || DEFAULT_TIMEFRAME;
  
  if (!worker) {
    const error: CommandResult = {
      success: false,
      error: 'Worker name is required. Usage: metrics <worker-name> [metric]',
    };
    outputCommandResult(error, isJson ?? false);
    process.exit(1);
  }
  
  if (!config.apiToken || !config.accountId) {
    const error: CommandResult = {
      success: false,
      error: 'Missing Cloudflare credentials. Run validate command first.',
    };
    outputCommandResult(error, isJson ?? false);
    process.exit(1);
  }
  
  try {
    const timeRange = parseTimeframe(timeframe);
    const metrics: Metrics = {
      worker,
      timeframe,
    };
    
    // Query request count
    if (metricType === 'all' || metricType === 'requests' || metricType === 'errors') {
      const countQueryBody = {
        queryId: 'workers-count',
        view: 'calculations',
        timeframe: timeRange,
        parameters: {
          datasets: ['cloudflare-workers'],
          filters: [
            {
              key: '$metadata.service',
              operation: 'eq',
              type: 'string',
              value: worker,
            },
          ],
          calculations: [
            {
              operator: 'count',
              key: '$metadata.requestId',
            },
          ],
        },
      };
      
      const countResult = await cloudflareApiRequest(
        config,
        '/workers/analytics/report',
        'POST',
        countQueryBody
      );
      
      const count = countResult?.data?.[0]?.count || 0;
      const timeWindowMinutes = parseTimeframeToMinutes(timeframe);
      const rate = timeWindowMinutes > 0 ? (count / timeWindowMinutes).toFixed(2) : '0';
      
      metrics.requests = {
        count,
        avg: count / (timeWindowMinutes || 1),
        rate: `${rate} req/min`,
      };
    }
    
    // Query latency metrics
    if (metricType === 'all' || metricType === 'latency') {
      const latencyQueryBody = {
        queryId: 'workers-latency',
        view: 'calculations',
        timeframe: timeRange,
        parameters: {
          datasets: ['cloudflare-workers'],
          filters: [
            {
              key: '$metadata.service',
              operation: 'eq',
              type: 'string',
              value: worker,
            },
          ],
          calculations: [
            { operator: 'avg', key: 'wall_time', keyType: 'number' as const },
            { operator: 'p50', key: 'wall_time', keyType: 'number' as const },
            { operator: 'p95', key: 'wall_time', keyType: 'number' as const },
            { operator: 'p99', key: 'wall_time', keyType: 'number' as const },
            { operator: 'max', key: 'wall_time', keyType: 'number' as const },
          ],
        },
      };
      
      const latencyResult = await cloudflareApiRequest(
        config,
        '/workers/analytics/report',
        'POST',
        latencyQueryBody
      );
      
      const latencyData = latencyResult?.data?.[0] || {};
      metrics.latency = {
        avg: Math.round(latencyData.wall_time_avg || 0),
        p50: Math.round(latencyData.wall_time_p50 || 0),
        p95: Math.round(latencyData.wall_time_p95 || 0),
        p99: Math.round(latencyData.wall_time_p99 || 0),
        max: Math.round(latencyData.wall_time_max || 0),
      };
    }
    
    // Query CPU metrics
    if (metricType === 'all' || metricType === 'cpu') {
      const cpuQueryBody = {
        queryId: 'workers-cpu',
        view: 'calculations',
        timeframe: timeRange,
        parameters: {
          datasets: ['cloudflare-workers'],
          filters: [
            {
              key: '$metadata.service',
              operation: 'eq',
              type: 'string',
              value: worker,
            },
          ],
          calculations: [
            { operator: 'avg', key: 'cpu_time', keyType: 'number' as const },
            { operator: 'max', key: 'cpu_time', keyType: 'number' as const },
            { operator: 'sum', key: 'cpu_time', keyType: 'number' as const },
          ],
        },
      };
      
      const cpuResult = await cloudflareApiRequest(
        config,
        '/workers/analytics/report',
        'POST',
        cpuQueryBody
      );
      
      const cpuData = cpuResult?.data?.[0] || {};
      metrics.cpu = {
        avg: Math.round(cpuData.cpu_time_avg || 0),
        max: Math.round(cpuData.cpu_time_max || 0),
        total: Math.round(cpuData.cpu_time_sum || 0),
      };
    }
    
    // Query error metrics
    if (metricType === 'all' || metricType === 'errors') {
      const errorQueryBody = {
        queryId: 'workers-errors',
        view: 'calculations',
        timeframe: timeRange,
        parameters: {
          datasets: ['cloudflare-workers'],
          filters: [
            {
              key: '$metadata.service',
              operation: 'eq',
              type: 'string',
              value: worker,
            },
            {
              key: '$metadata.status',
              operation: 'gte',
              type: 'number',
              value: 500,
            },
          ],
          calculations: [
            {
              operator: 'count',
              key: '$metadata.requestId',
            },
          ],
        },
      };
      
      const errorResult = await cloudflareApiRequest(
        config,
        '/workers/analytics/report',
        'POST',
        errorQueryBody
      );
      
      const errorCount = errorResult?.data?.[0]?.count || 0;
      const totalCount = metrics.requests?.count || 0;
      const errorRate = totalCount > 0 ? (errorCount / totalCount) : 0;
      
      metrics.errors = {
        count: errorCount,
        rate: errorRate,
        percentage: `${(errorRate * 100).toFixed(2)}%`,
      };
    }
    
    if (isJson) {
      const successResult: CommandResult = {
        success: true,
        data: metrics,
        metadata: {
          query_time: formatTimestamp(new Date()),
          source: 'cloudflare-workers',
        },
      };
      console.log(JSON.stringify(successResult, null, 2));
    } else {
      console.log(`\n=== Performance Metrics for ${worker} (${timeframe}) ===\n`);
      
      if (metrics.latency) {
        console.log('Latency:');
        console.log(`  Average: ${metrics.latency.avg}ms`);
        console.log(`  P50: ${metrics.latency.p50}ms`);
        console.log(`  P95: ${metrics.latency.p95}ms`);
        console.log(`  P99: ${metrics.latency.p99}ms`);
        console.log(`  Max: ${metrics.latency.max}ms`);
        console.log();
      }
      
      if (metrics.requests) {
        console.log(`Request Count: ${metrics.requests.count.toLocaleString()}`);
        console.log(`Rate: ${metrics.requests.rate}`);
        console.log();
      }
      
      if (metrics.cpu) {
        console.log('CPU Time:');
        console.log(`  Average: ${metrics.cpu.avg}ms`);
        console.log(`  Max: ${metrics.cpu.max}ms`);
        console.log(`  Total: ${metrics.cpu.total}ms`);
        console.log();
      }
      
      if (metrics.errors) {
        console.log(`Error Count: ${metrics.errors.count.toLocaleString()}`);
        console.log(`Error Rate: ${metrics.errors.percentage}`);
        console.log();
      }
    }
  } catch (e: any) {
    const errorResult: CommandResult = {
      success: false,
      error: e.message || 'Failed to query metrics',
    };
    outputCommandResult(errorResult, isJson ?? false);
    process.exit(1);
  }
}

function parseTimeframeToMinutes(timeframe: string): number {
  const match = timeframe.match(/^(\d+)([mhdw])$/);
  if (!match) return 60; // Default 1h
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 'm': return value;
    case 'h': return value * 60;
    case 'd': return value * 24 * 60;
    case 'w': return value * 7 * 24 * 60;
    default: return 60;
  }
}

async function cmdTail(args: Args): Promise<void> {
  const config = loadEnvConfig();
  const worker = args.worker;
  const isJson = args.json;
  
  if (!worker) {
    const error: CommandResult = {
      success: false,
      error: 'Worker name is required. Usage: tail <worker-name>',
    };
    outputCommandResult(error, isJson ?? false);
    process.exit(1);
  }
  
  if (!config.apiToken || !config.accountId) {
    const error: CommandResult = {
      success: false,
      error: 'Missing Cloudflare credentials. Run validate command first.',
    };
    outputCommandResult(error, isJson ?? false);
    process.exit(1);
  }
  
  if (!isJson) {
    console.log(`\n=== Live Tail for ${worker} ===`);
    console.log('Streaming logs... (Press Ctrl+C to stop)\n');
  }
  
  // Use wrangler tail command for live streaming
  const wranglerArgs = ['tail', worker];
  
  try {
    const tailProcess = spawn('wrangler', wranglerArgs, {
      env: { 
        ...process.env, 
        CLOUDFLARE_API_TOKEN: config.apiToken, 
        CLOUDFLARE_ACCOUNT_ID: config.accountId 
      },
      stdio: 'inherit',
    });
    
    tailProcess.on('error', (e: any) => {
      console.error(`Tail error: ${e.message}`);
      process.exit(1);
    });
    
    tailProcess.on('exit', (code: number) => {
      process.exit(code || 0);
    });
  } catch (e: any) {
    const errorResult: CommandResult = {
      success: false,
      error: e.message || 'Failed to start tail',
    };
    outputCommandResult(errorResult, isJson ?? false);
    process.exit(1);
  }
}

async function cmdStatus(args: Args): Promise<void> {
  const config = loadEnvConfig();
  const worker = args.worker;
  const isJson = args.json;
  
  if (!worker) {
    const error: CommandResult = {
      success: false,
      error: 'Worker name is required. Usage: status <worker-name>',
    };
    outputCommandResult(error, isJson ?? false);
    process.exit(1);
  }
  
  if (!config.apiToken || !config.accountId) {
    const error: CommandResult = {
      success: false,
      error: 'Missing Cloudflare credentials. Run validate command first.',
    };
    outputCommandResult(error, isJson ?? false);
    process.exit(1);
  }
  
  try {
    // Get worker script info
    const workerInfo = await cloudflareApiRequest(
      config,
      `/workers/scripts/${worker}`,
      'GET'
    );
    
    const status: WorkerStatus = {
      name: worker,
      deployed: !!workerInfo,
    };
    
    if (workerInfo) {
      status.version = workerInfo.version || 1;
      status.lastDeployed = workerInfo.modified_on || workerInfo.created_on;
      status.url = `https://${worker}.workers.dev`;
      
      // Get bindings if available
      if (workerInfo.bindings) {
        status.bindings = workerInfo.bindings.map((b: any) => ({
          type: b.type,
          name: b.name,
          id: b.namespace_id || b.database_id || b.id,
        }));
      }
      
      status.health = 'All checks passing';
    }
    
    if (isJson) {
      const successResult: CommandResult = {
        success: true,
        data: status,
        metadata: {
          query_time: formatTimestamp(new Date()),
          source: 'cloudflare-workers',
        },
      };
      console.log(JSON.stringify(successResult, null, 2));
    } else {
      console.log(`\n=== Worker Status: ${worker} ===\n`);
      
      if (status.deployed) {
        console.log('✓ Deployed');
        if (status.version) {
          console.log(`  Current Version: ${status.version}`);
        }
        if (status.lastDeployed) {
          console.log(`  Last Deployed: ${status.lastDeployed}`);
        }
        if (status.url) {
          console.log(`  URL: ${status.url}`);
        }
        
        if (status.bindings && status.bindings.length > 0) {
          console.log('\nBindings:');
          status.bindings.forEach(binding => {
            console.log(`  - ${binding.type}: ${binding.name}${binding.id ? ` (${binding.id})` : ''}`);
          });
        }
        
        if (status.health) {
          console.log(`\nHealth: ${status.health}`);
        }
      } else {
        console.log('✗ Not deployed');
        console.log('  Use "deploy" command to deploy this worker.');
      }
      
      console.log();
    }
  } catch (e: any) {
    if (e.message?.includes('404')) {
      // Worker not found
      if (isJson) {
        const result: CommandResult = {
          success: true,
          data: {
            name: worker,
            deployed: false,
          },
          metadata: {
            query_time: formatTimestamp(new Date()),
            source: 'cloudflare-workers',
          },
        };
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`\n=== Worker Status: ${worker} ===\n`);
        console.log('✗ Not deployed');
        console.log('  Worker not found. Use "deploy" command to deploy.');
        console.log();
      }
    } else {
      const errorResult: CommandResult = {
        success: false,
        error: e.message || 'Failed to get worker status',
      };
      outputCommandResult(errorResult, isJson ?? false);
      process.exit(1);
    }
  }
}

function outputCommandResult(result: CommandResult, isJson: boolean): void {
  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!result.success && result.error) {
    console.log(`Error: ${result.error}`);
  }
}

function showHelp(): void {
  console.log(`
Wrangler + Cloudflare MCP CLI

Usage: npx ts-node wrangler-mcp-cli.ts <command> [options]

Commands:
  deploy [env]              Deploy Worker using Wrangler
  logs <worker> [options]   Query logs via Cloudflare MCP
  errors <worker> [timeframe]  Find errors in Worker logs
  metrics <worker> [metric]    Get performance metrics
  tail <worker>             Start live log tailing
  status <worker>           Check Worker deployment status
  validate                  Validate Wrangler config and MCP connection
  help                      Show this help message

Options:
  --from <timeframe>        Start time (e.g., 1h, 24h, 7d)
  --to <time>               End time (ISO 8601 or 'now')
  --limit <number>          Max log entries (default: 100)
  --status <code>           Filter by HTTP status
  --path <pattern>          Filter by request path
  --json                    Output as JSON
  --direct-api              Use direct API (bypass MCP)

Examples:
  npx ts-node wrangler-mcp-cli.ts validate
  npx ts-node wrangler-mcp-cli.ts deploy production
  npx ts-node wrangler-mcp-cli.ts logs my-worker --from 1h
  npx ts-node wrangler-mcp-cli.ts errors my-worker 24h
  npx ts-node wrangler-mcp-cli.ts metrics my-worker latency
  npx ts-node wrangler-mcp-cli.ts tail my-worker
  npx ts-node wrangler-mcp-cli.ts status my-worker

Environment Variables:
  CLOUDFLARE_API_TOKEN     Required: Cloudflare API token
  CLOUDFLARE_ACCOUNT_ID    Required: Cloudflare account ID
`);
}

// Main

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  
  try {
    switch (args.command) {
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
      
      case 'validate':
        await cmdValidate(args);
        break;
      
      case 'deploy':
        cmdDeploy(args);
        break;
      
      case 'logs':
        await cmdLogs(args);
        break;
      
      case 'errors':
        await cmdErrors(args);
        break;
      
      case 'metrics':
        await cmdMetrics(args);
        break;
      
      case 'tail':
        await cmdTail(args);
        break;
      
      case 'status':
        await cmdStatus(args);
        break;
      
      default:
        console.log(`Unknown command: ${args.command}`);
        console.log('Run with --help for usage information.');
        process.exit(1);
    }
  } catch (e: any) {
    console.error(`Error: ${e.message}`);
    if (args.json) {
      console.log(JSON.stringify({
        success: false,
        error: e.message,
      }, null, 2));
    }
    process.exit(1);
  }
}

main();
