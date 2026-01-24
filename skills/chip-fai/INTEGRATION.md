# Clawdbot Integration

## Usage in Clawdbot

The chip-fai skill provides a **step-by-step workflow** for AI image generation via Telegram inline buttons.

### Trigger Command

User sends: `/gen`

### Workflow Steps

1. **Start** → Show category buttons
2. **Category** → Show model buttons (Create/Edit/Enhance)
3. **Model** → Show aspect ratio buttons (if Create) or request prompt
4. **Aspect Ratio** → Request prompt
5. **Prompt** → Generate image and return

### Example Integration

```python
from skills.chip_fai.scripts.handle_workflow import HANDLERS
from skills.chip_fai.scripts.execute_generation import execute_command

# Step 1: User sends /gen
response = HANDLERS['start']('user_123')
# Returns: {message: "...", buttons: [[{text, callback_data}]]}

# Send to Telegram via Clawdbot message tool
message(
    action='send',
    target='user_123',
    message=response['message'],
    buttons=response['buttons']
)

# Step 2: User clicks "Create"
response = HANDLERS['category']('user_123', 'create')
message(action='send', target='user_123', **response)

# Step 3: User clicks "FLUX2-C"
response = HANDLERS['model']('user_123', 'flux-pro')
message(action='send', target='user_123', **response)

# Step 4: User clicks "square"
response = HANDLERS['ratio']('user_123', 'square')
message(action='send', target='user_123', **response)

# Step 5: User sends "cyberpunk city"
response = HANDLERS['prompt']('user_123', 'cyberpunk city')

# Execute generation
result = execute_command(response['generate_cmd'])

# Send result
if result['success']:
    message(
        action='send',
        target='user_123',
        message="✅ Generated!",
        media=result['output_path']
    )
else:
    message(
        action='send',
        target='user_123',
        message=f"❌ Error: {result['error']}"
    )
```

### Callback Data Format

Buttons use these callback patterns:
- `category:<name>` → Category selection (create/edit/enhance)
- `model:<id>` → Model selection (nanobana-create, flux-pro, etc.)
- `ratio:<id>` → Aspect ratio (square, landscape_16_9, etc.)
- `back:<to>` → Back navigation (back:category, back:model)

### Session State

Sessions are stored in `state/<session_id>.json`:
- Auto-expire after 24 hours
- Track user progress: category → model → ratio → prompt
- Include history of past generations

### Direct Generation (Bypass Workflow)

For power users or automation:

```bash
bash scripts/generate.sh \
  --model recraft \
  --prompt "your prompt" \
  --aspect-ratio square
```

Returns: Path to generated image

### Error Handling

All errors return JSON with:
```json
{
  "success": false,
  "error": "Description",
  "stdout": "...",
  "stderr": "..."
}
```

### Monitoring

Check generation stats:
```bash
python3 scripts/metrics.py
```

Returns:
```json
{
  "total_generations": 10,
  "successful": 9,
  "failed": 1,
  "success_rate": "90.0%"
}
```

## Telegram Button Example

When user clicks category button with `callback_data="category:create"`:

1. Parse callback: `action, value = data.split(':')`
2. Call handler: `HANDLERS[action](session_id, value)`
3. Send response with new buttons
4. Wait for next callback or text message

## Complete Flow Example

```
User: /gen
Bot: 🎨 AI Image Generation
     [Create] [Edit]
     [Enhance]

User: *clicks Create*
Bot: 🎨 Create (Text-to-Image)
     [Gem3/PRE] [FLUX2-C]
     [RECRAFT] [WAN25/C]
     [⬅️ Back]

User: *clicks FLUX2-C*
Bot: FLUX2-C
     Select aspect ratio:
     [1:1 Square] [9:16 Portrait]
     [4:3 Landscape] [16:9 Landscape]
     [⬅️ Back]

User: *clicks 16:9 Landscape*
Bot: FLUX2-C
     Aspect Ratio: 16:9 Landscape
     
     Send your text prompt.

User: cyberpunk city at night
Bot: 🚀 Generating...
     📝 cyberpunk city at night
     📐 16:9 Landscape
     
     *18 seconds later*
     
     ✅ Generated!
     *[image attached]*
```
