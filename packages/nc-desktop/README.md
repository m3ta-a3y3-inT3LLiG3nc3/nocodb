# NocoDB Desktop (macOS, Windows, Linux)

A native desktop application for NocoDB with built-in **M3ta-Os REA MCP** (Model Context Protocol) integration.

## Features

- **Native macOS Experience:** Custom window styling (`hiddenInset` title bar, macOS traffic light positioning, dark/light theme awareness).
- **Auto-Discovery & Splash Screen:** Automatically verifies connection to the NocoDB engine on `http://localhost:8080` (or custom host).
- **M3ta-Os REA MCP Integration:** Built-in shortcut (<kbd>Cmd+M</kbd>) and menu command to export and inspect Model Context Protocol settings for autonomous agents.
- **External URL Handling:** Links outside the NocoDB instance automatically open safely in the user's default browser.
- **Cross-Platform Packaging:** Pre-configured with `electron-builder` to produce macOS DMG / Zip (Apple Silicon & Intel), Windows NSIS / Portable, and Linux AppImage / Deb.

---

## M3ta-Os REA MCP Integration

NocoDB features native Model Context Protocol (MCP) server endpoints (`/mcp/:mcpTokenId`), enabling AI agents (M3ta-Os REA, Claude Desktop, Cursor, OpenMuse) to execute queries, manipulate spreadsheet rows, and inspect base schemas directly.

### Configuration Snippet

Add this to your MCP settings file (e.g., `claude_desktop_config.json`, Cursor MCP settings, or M3ta-Os REA configuration):

```json
{
  "mcpServers": {
    "nocodb": {
      "url": "http://localhost:8080/mcp/<YOUR_MCP_TOKEN_ID>",
      "headers": {
        "xc-mcp-token": "<YOUR_MCP_TOKEN>"
      }
    }
  }
}
```

### Supported MCP Tools

- `listBases`: Enumerate all available bases/projects.
- `listTables`: Discover tables inside a base.
- `describeTable`: Inspect columns, UI types, relationships, and foreign keys.
- `queryRecords`: Query, filter, sort, and paginate spreadsheet records.
- `createRecord`: Insert new records with validation.
- `updateRecord`: Update fields on existing records.
- `deleteRecord`: Delete records safely.

---

## Development & Building

### Run Desktop App in Development
```bash
# In the root repository
pnpm start:desktop

# Or inside packages/nc-desktop
cd packages/nc-desktop
pnpm dev
```

### Build macOS DMG & App Package
```bash
# In the root repository
pnpm build:desktop:mac

# Or for specific architecture:
cd packages/nc-desktop
pnpm dist:mac:arm64   # Apple Silicon (M1/M2/M3/M4)
pnpm dist:mac:x64     # Intel Mac
```

Generated packages will be output to:
`packages/nc-desktop/dist-package/`
