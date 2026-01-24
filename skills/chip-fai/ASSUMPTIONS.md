# Assumptions

## System Requirements

1. **Operating System**: Linux or macOS
   - Bash 4.0+ required (macOS ships with 3.2, needs upgrade)
   - `stat` command varies: `-c` (Linux) vs `-f` (macOS)

2. **Python**: 3.10 or higher
   - Uses `match/case` (3.10+), `Path.read_text()`, `datetime.fromisoformat()`
   - No external packages required (stdlib only)

3. **Binaries in PATH**:
   - `jq` (>= 1.6) - JSON parsing
   - `curl` (>= 7.0) - HTTP requests
   - `base64` (GNU coreutils) - Image encoding/decoding
   - `bash` (>= 4.0) - Script execution

## API Behavior

1. **Response Format**: API returns one of:
   - `{image: "https://..."}`  (URL)
   - `{images: [{url: "https://..."}]}` (array)
   - `{image: "data:image/jpeg;base64,..."}` (base64)

2. **Timeout**: API responds within 180 seconds
   - Longer requests are timed out
   - Retry logic assumes transient failures

3. **Rate Limits**: API has undocumented rate limits
   - No automatic throttling implemented
   - User-facing errors on rate limit exceeded

4. **Token Lifetime**: `CHIP_FAI_API_TOKEN` does not expire
   - No token rotation mechanism
   - Manual update required if changed

## File System

1. **Permissions**: Script has write access to:
   - `media/` - Generated images
   - `state/` - Session state
   - `logs/` - Log files

2. **Disk Space**: Unlimited growth assumed
   - No automatic cleanup of old images
   - No log rotation by default
   - Manual cleanup required

3. **.env Security**: `.env` file is readable only by user
   - Not checked automatically
   - Assumed secure file permissions (600)

## Submodule

1. **Up-to-date**: `repo/telegram-bot/bot.py` is current
   - MODEL_CONFIGS format unchanged
   - New models added in same structure
   - Manual `git submodule update` required

2. **Python Dict Format**: bot.py uses Python dict syntax
   - Single-quoted strings: `'model-id': {...}`
   - Boolean values: `True`/`False`
   - Parser assumes this format

## Concurrency

1. **File Locking**: No file locking on:
   - `metrics.jsonl` (concurrent writes may corrupt)
   - Session state files (one session = one user = no conflict)

2. **Session Isolation**: Session IDs are unique
   - No cross-session interference
   - No shared mutable state

## Network

1. **Connectivity**: Internet access available
   - No offline mode
   - API endpoint reachable
   - curl handles DNS, SSL, redirects

2. **Firewall**: No outbound restrictions
   - Port 443 (HTTPS) allowed
   - No proxy configuration

## Telegram Integration

1. **Button Format**: Clawdbot message tool accepts:
   ```json
   {
     "message": "text",
     "buttons": [[{text, callback_data}]]
   }
   ```

2. **Callback Routing**: Callbacks route back as user messages
   - Pattern: `action:value`
   - Parsed by integration layer

## Error Handling

1. **User Visible**: Errors shown as-is to user
   - Debugging enabled by default
   - No sanitization of error messages

2. **Non-Fatal Warnings**: Health check warnings don't block execution
   - API connectivity WARN is acceptable
   - Missing optional features don't fail

## Monitoring

1. **Manual**: No automatic alerting
   - Metrics collected but not analyzed
   - Logs written but not watched
   - Human checks required
