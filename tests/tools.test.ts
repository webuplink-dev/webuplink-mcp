/**
 * Unit tests for MCP server tool registration and behavior.
 *
 * Uses the MCP SDK's InMemoryTransport to create a realistic client-server
 * pair that tests the full protocol round-trip, not internal implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { WebUplink, WebUplinkError } from 'webuplink';
import { createServer } from '../src/tools.js';

// ── Mock WebUplink Client ───────────────────────────────────────

function createMockClient() {
  return {
    browse: vi.fn(),
    closeSession: vi.fn(),
    health: vi.fn(),
    getUsage: vi.fn(),
  } as unknown as WebUplink;
}

// ── Helpers ─────────────────────────────────────────────────────

async function setupTestEnv() {
  const mockClient = createMockClient();
  const server = createServer(mockClient);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client({ name: 'test-client', version: '1.0.0' });

  // Connect both sides
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return { client, server, mockClient, clientTransport, serverTransport };
}

// ── Tests ───────────────────────────────────────────────────────

describe('MCP Tools', () => {
  let client: Client;
  let mockClient: ReturnType<typeof createMockClient>;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const env = await setupTestEnv();
    client = env.client;
    mockClient = env.mockClient as ReturnType<typeof createMockClient>;
    cleanup = async () => {
      await env.client.close();
      await env.server.close();
    };
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('tool listing', () => {
    it('registers browse and close_session tools', async () => {
      const result = await client.listTools();
      const toolNames = result.tools.map(t => t.name);

      expect(toolNames).toContain('browse');
      expect(toolNames).toContain('close_session');
      expect(toolNames).toHaveLength(2);
    });

    it('browse tool has correct input schema', async () => {
      const result = await client.listTools();
      const browseTool = result.tools.find(t => t.name === 'browse');

      expect(browseTool).toBeDefined();
      expect(browseTool!.inputSchema.properties).toHaveProperty('url');
      expect(browseTool!.inputSchema.properties).toHaveProperty('session_id');
      expect(browseTool!.inputSchema.properties).toHaveProperty('tool');
      expect(browseTool!.inputSchema.properties).toHaveProperty('params');
    });
  });

  describe('browse tool', () => {
    it('forwards arguments to client.browse()', async () => {
      const browseResponse = {
        session_id: 's1',
        url: 'https://example.com',
        title: 'Example',
        summary: 'Test page',
        tools: [],
      };
      (mockClient.browse as ReturnType<typeof vi.fn>).mockResolvedValue(browseResponse);

      await client.callTool({ name: 'browse', arguments: { url: 'https://example.com' } });

      expect(mockClient.browse).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://example.com' }),
      );
    });

    it('returns JSON stringified result', async () => {
      const browseResponse = {
        session_id: 's1',
        url: 'https://example.com',
        title: 'Example',
        summary: 'Test page',
        tools: [{ name: 'click_button', description: 'Click it', params: [] }],
      };
      (mockClient.browse as ReturnType<typeof vi.fn>).mockResolvedValue(browseResponse);

      const result = await client.callTool({ name: 'browse', arguments: { url: 'https://example.com' } });

      expect(result.content).toHaveLength(1);
      const textContent = result.content[0] as { type: string; text: string };
      expect(textContent.type).toBe('text');
      const parsed = JSON.parse(textContent.text);
      expect(parsed.session_id).toBe('s1');
      expect(parsed.tools).toHaveLength(1);
    });

    it('catches WebUplinkError and returns MCP error', async () => {
      (mockClient.browse as ReturnType<typeof vi.fn>).mockRejectedValue(
        new WebUplinkError({
          code: 'QUOTA_EXCEEDED',
          message: 'Monthly quota exceeded',
          statusCode: 429,
          requestId: 'req-123',
        }),
      );

      const result = await client.callTool({ name: 'browse', arguments: { url: 'https://example.com' } });

      expect(result.isError).toBe(true);
      const textContent = result.content[0] as { type: string; text: string };
      expect(textContent.text).toContain('QUOTA_EXCEEDED');
      expect(textContent.text).toContain('Monthly quota exceeded');
    });
  });

  describe('close_session tool', () => {
    it('calls client.closeSession() with session_id', async () => {
      (mockClient.closeSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await client.callTool({
        name: 'close_session',
        arguments: { session_id: 'session-abc' },
      });

      expect(mockClient.closeSession).toHaveBeenCalledWith('session-abc');
      const textContent = result.content[0] as { type: string; text: string };
      expect(textContent.text).toContain('session-abc');
      expect(textContent.text).toContain('closed successfully');
    });

    it('catches WebUplinkError on close', async () => {
      (mockClient.closeSession as ReturnType<typeof vi.fn>).mockRejectedValue(
        new WebUplinkError({
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found',
          statusCode: 404,
          requestId: 'req-456',
        }),
      );

      const result = await client.callTool({
        name: 'close_session',
        arguments: { session_id: 'nonexistent' },
      });

      expect(result.isError).toBe(true);
      const textContent = result.content[0] as { type: string; text: string };
      expect(textContent.text).toContain('SESSION_NOT_FOUND');
    });
  });
});
