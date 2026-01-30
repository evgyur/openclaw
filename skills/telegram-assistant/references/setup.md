# telegram-mcp-api Setup (for telegram-assistant)

This skill supports two modes of operation:
- **MCP Mode**: For Claude Desktop / Cursor integration
- **HTTP API Mode**: For local automation scripts

## Prerequisites

- Python 3.10+
- Docker & Docker Compose (for containerized deployment)
- `uv` (Python package manager, for local development)
- Telegram account
- Telegram API credentials from https://my.telegram.org

## Step 1: Clone telegram-mcp-api

```bash
git clone https://github.com/DimaPhil/telegram-mcp-api.git
cd telegram-mcp-api
```

## Step 2: Configure credentials

Create a `.env` file in the `telegram-mcp-api` directory:

```bash
TELEGRAM_API_ID=...        # from https://my.telegram.org
TELEGRAM_API_HASH=...      # from https://my.telegram.org
TELEGRAM_SESSION_NAME=telegram_assistant
```

Generate a session string:

```bash
# Install dependencies first
uv sync

# Generate session
uv run python session_string_generator.py
```

Add the output to `.env`:

```bash
TELEGRAM_SESSION_STRING=...   # treat as a password - full account access
```

---

## Option A: MCP Mode (Claude Desktop / Cursor)

For interactive use with Claude Desktop or Cursor.

### Register the MCP server

```bash
claude mcp add telegram-mcp -s user -- uv run --directory /ABS/PATH/TO/telegram-mcp-api python main.py
claude mcp list
```

Restart the agent app after adding the server.

### Verify

In Claude Desktop, you should see `telegram-mcp` tools available. Test with:
```
Use mcp__telegram-mcp__get_me to get my Telegram info
```

---

## Option B: HTTP API Mode (Local Scripts)

For automation scripts running on your local machine.

### Start the API with Docker Compose

```bash
cd /path/to/telegram-mcp-api
docker compose up telegram-api --build -d
```

This starts the HTTP API on `http://localhost:8080`.

### Verify

```bash
# Health check
curl http://localhost:8080/health

# Get current user
curl http://localhost:8080/me
```

### Use the Python client

Copy `telegram_client.py` to your scripts directory or add telegram-mcp to your Python path:

```python
import sys
sys.path.insert(0, '/path/to/telegram-mcp-api')

from telegram_client import TelegramClient

client = TelegramClient()  # Defaults to http://localhost:8080
print(client.get_me())
client.close()
```

### Example scripts

See `telegram-mcp/examples/` for ready-to-use scripts:
- `example_usage.py` - Basic operations demo
- `send_message.py` - Send a message via CLI
- `search_messages.py` - Search messages in a chat

---

## Option C: Both Modes (Recommended)

Run both MCP and HTTP API simultaneously for maximum flexibility.

### Start both services

```bash
cd /path/to/telegram-mcp-api
docker compose up --build -d
```

This starts:
- `telegram-mcp`: MCP server (stdio, for Claude/Cursor)
- `telegram-api`: HTTP API on port 8080 (for scripts)

### Register MCP (if using Claude Desktop)

```bash
claude mcp add telegram-mcp -s user -- docker compose -f /ABS/PATH/TO/telegram-mcp/docker-compose.yml exec -T telegram-mcp python main.py
```

Or use the local uv method from Option A.

---

## Docker Compose Services

| Service | Purpose | Access |
|---------|---------|--------|
| `telegram-mcp` | MCP server for Claude/Cursor | stdio (internal) |
| `telegram-api` | HTTP API for scripts | `http://localhost:8080` |

### Useful commands

```bash
# Start API only
docker compose up telegram-api -d

# Start both
docker compose up -d

# View logs
docker compose logs -f telegram-api

# Stop all
docker compose down

# Rebuild after code changes
docker compose up --build -d
```

---

## Security Notes

- The session string grants full Telegram account access.
- Never commit `.env` or session strings to version control.
- The `.env` file is in `.gitignore` by default.
- Prefer draft-first actions (`save_draft`) over `send_message`.
- The HTTP API binds to `0.0.0.0:8080` - consider firewall rules if on a shared network.

---

## Troubleshooting

### Session issues
```bash
# Regenerate session string
cd /path/to/telegram-mcp-api
uv run python session_string_generator.py
# Update .env with new TELEGRAM_SESSION_STRING
docker compose restart
```

### Container won't start
```bash
docker compose logs telegram-api
# Check for missing env vars or session issues
```

### MCP not connecting
```bash
claude mcp list
# Verify telegram-mcp is listed
# Try removing and re-adding:
claude mcp remove telegram-mcp
claude mcp add telegram-mcp -s user -- uv run --directory /path/to/telegram-mcp-api python main.py
```

### Rate limits
- Telegram has rate limits on API calls
- Space out bulk operations
- Use pagination (page_size) to limit data per request
