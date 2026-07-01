#!/usr/bin/env node
/**
 * MCP server — stdio transport entry point.
 *
 * Designed to be spawned by Claude Desktop, Cursor, or any MCP host.
 * Configuration via environment variables:
 *   - WEBUPLINK_API_KEY (required) — WebUplink API key
 *   - WEBUPLINK_BASE_URL (optional, default https://api.webuplink.ai) — WebUplink API base URL
 *
 * Usage in claude_desktop_config.json:
 * ```json
 * {
 *   "mcpServers": {
 *     "webuplink": {
 *       "command": "npx",
 *       "args": ["-y", "@webuplink/mcp"],
 *       "env": {
 *         "WEBUPLINK_API_KEY": "wup_..."
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * @module @webuplink/mcp
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClientFromEnv } from './env.js';
import { createServer } from './tools.js';

const client = createClientFromEnv();
const server = createServer(client);
const transport = new StdioServerTransport();

await server.connect(transport);
