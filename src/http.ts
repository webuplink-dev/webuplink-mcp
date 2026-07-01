#!/usr/bin/env node
/**
 * MCP server — Streamable HTTP transport entry point.
 *
 * Runs the MCP server as an HTTP endpoint for remote/shared deployments.
 * Uses the MCP SDK's StreamableHTTPServerTransport.
 *
 * Configuration via environment variables:
 *   - WEBUPLINK_API_KEY (required) — WebUplink API key
 *   - WEBUPLINK_BASE_URL (optional, default https://api.webuplink.ai) — WebUplink API base URL
 *   - PORT (optional, default 3001) — HTTP port to listen on
 *
 * @module @webuplink/mcp/http
 */

import { createServer as createHttpServer } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createClientFromEnv } from './env.js';
import { createServer } from './tools.js';

const client = createClientFromEnv();
const port = parseInt(process.env['PORT'] ?? '3001', 10);

// Single MCP server instance shared across requests
const server = createServer(client);

const httpServer = createHttpServer(async (req, res) => {
  if (req.url === '/mcp' || req.url === '/') {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

httpServer.listen(port, () => {
  console.log(`WebUplink MCP HTTP server listening on port ${port}`);
  console.log(`Connect to http://localhost:${port}/mcp`);
});
