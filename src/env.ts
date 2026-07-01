/**
 * MCP server — shared environment configuration.
 *
 * Validates and parses required environment variables.
 * Used by both stdio and HTTP entry points to avoid duplication.
 *
 * @module @webuplink/mcp/env
 */

import { WebUplink } from 'webuplink';

/** Validate required env vars and return a configured WebUplink client. */
export function createClientFromEnv(): WebUplink {
  const apiKey = process.env['WEBUPLINK_API_KEY'];
  const baseUrl = process.env['WEBUPLINK_BASE_URL'];

  if (!apiKey) {
    console.error('Error: WEBUPLINK_API_KEY environment variable is required.');
    process.exit(1);
  }

  // Only pass baseUrl if explicitly set; otherwise the SDK uses its default.
  return new WebUplink({ apiKey, ...(baseUrl && { baseUrl }) });
}
