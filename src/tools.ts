/**
 * MCP tool registration — transport-agnostic.
 *
 * Creates an McpServer with `browse` and `close_session` tools.
 * The returned server can be connected to any transport (stdio, HTTP)
 * without duplicating tool logic.
 *
 * Error handling: WebUplinkError is caught and returned as structured
 * MCP error responses (isError: true) so LLMs get actionable context
 * instead of opaque crash messages.
 *
 * @module @webuplink/mcp/tools
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { WebUplink, WebUplinkError } from 'webuplink';
import { z } from 'zod';

/**
 * Wrap an async handler so that WebUplinkError is returned as a structured
 * MCP error response instead of crashing the connection.
 */
function withErrorHandling(
  fn: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  return fn().catch((err: unknown) => {
    if (err instanceof WebUplinkError) {
      return {
        content: [{ type: 'text' as const, text: `Error [${err.code}]: ${err.message}` }],
        isError: true,
      };
    }
    throw err;
  });
}

/**
 * Create a configured MCP server with WebUplink tools.
 *
 * @param client - An authenticated WebUplink SDK client.
 * @returns A configured McpServer ready to be connected to a transport.
 */
export function createServer(client: WebUplink): McpServer {
  const server = new McpServer({
    name: 'webuplink',
    version: '0.1.1',
  });

  // ── Tool 1: browse ──────────────────────────────────────────

  server.tool(
    'browse',
    'Browse a web page or execute tools on a page. Use url to open a new session, or session_id to continue an existing session.',
    {
      url: z.string().url().optional().describe('URL to open a new browser session'),
      session_id: z.string().optional().describe('Existing session ID to continue browsing'),
      tool: z.string().optional().describe('Tool name to execute on the page'),
      params: z.record(z.string(), z.unknown()).optional().describe('Parameters for the tool'),
      tools: z.array(z.object({
        tool: z.string(),
        params: z.record(z.string(), z.unknown()),
      })).optional().describe('Array of tools to execute in sequence (batch)'),
      include_page_content: z.boolean().optional().describe('Include detailed page content analysis'),
    },
    (args) => withErrorHandling(async () => {
      const result = await client.browse(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }),
  );

  // ── Tool 2: close_session ───────────────────────────────────

  server.tool(
    'close_session',
    'Close a browser session to free resources. Sessions auto-expire after 2 minutes of inactivity, but explicit cleanup is recommended.',
    {
      session_id: z.string().describe('Session ID to close'),
    },
    ({ session_id }) => withErrorHandling(async () => {
      await client.closeSession(session_id);
      return {
        content: [{ type: 'text', text: `Session ${session_id} closed successfully.` }],
      };
    }),
  );

  return server;
}
