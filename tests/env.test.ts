/**
 * Unit tests for MCP server environment configuration.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { WebUplink } from 'webuplink';

describe('createClientFromEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns a client when WEBUPLINK_API_KEY is set', async () => {
    vi.stubEnv('WEBUPLINK_API_KEY', 'test-key-123');
    vi.stubEnv('WEBUPLINK_BASE_URL', 'https://custom.api.dev');

    // Dynamically import to pick up the stubbed env
    const { createClientFromEnv } = await import('../src/env.js');
    const client = createClientFromEnv();

    expect(client).toBeInstanceOf(WebUplink);
  });

  it('exits when WEBUPLINK_API_KEY is missing', async () => {
    vi.stubEnv('WEBUPLINK_API_KEY', '');
    delete process.env['WEBUPLINK_API_KEY'];

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { createClientFromEnv } = await import('../src/env.js');

    expect(() => createClientFromEnv()).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('WEBUPLINK_API_KEY'),
    );
  });
});
