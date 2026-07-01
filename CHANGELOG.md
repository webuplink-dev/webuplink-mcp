# Changelog

## 0.1.0 (2026-06-30)

Initial public release.

### Features

- `browse` tool — browse pages and execute tools via MCP
- `close_session` tool — explicit session cleanup
- Stdio transport for Claude Desktop, Cursor, and other MCP hosts
- Streamable HTTP transport for remote/shared deployments
- Structured error responses — `WebUplinkError` caught and returned as MCP `isError: true` with error code and message
- Environment-based configuration (`WEBUPLINK_API_KEY`, `WEBUPLINK_BASE_URL`)
