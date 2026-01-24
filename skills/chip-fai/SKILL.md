---
name: chip-fai
description: AI Image Generation via chip-fai API. 18 AI models for text-to-image, image editing, and enhancement. Gemini, FLUX, Recraft, and more. Step-by-step workflow with inline buttons for model and aspect ratio selection.
metadata: {"clawdbot":{"emoji":"🎨","requires":{"bins":["python3","jq","curl","base64"]}}}
---

# chip-fai Image Generation

Generate AI images using 18 state-of-the-art models from your chip-fai API.

## Features

- **18 AI Models** across 3 categories:
  - 🎨 **Create** (Text-to-Image): Gemini 3, FLUX 2, Recraft, Wan 2.5
  - ✏️ **Edit** (Image-to-Image): FLUX Edit, Seedream, Background Replace, etc.
  - ✨ **Enhance** (Quality Improvement): Upscale, Face Retouch, Photo Restore, etc.

- **Step-by-Step Workflow** with inline buttons
- **Automatic Model Sync** via git submodule
- **Production-Ready** error handling

## Usage

### Interactive Mode (Recommended)

Start the image generation workflow:

```
/gen
```

This will show inline buttons for:
1. **Category Selection**: Create / Edit / Enhance
2. **Model Selection**: Choose from 18 models
3. **Aspect Ratio** (for Create models): square, portrait, landscape variants
4. **Prompt Input**: Send your text description

### Direct Generation (Advanced)

Generate directly with command-line parameters:

```bash
bash {baseDir}/scripts/generate.sh \
  --model nanobana-create \
  --prompt "a beautiful sunset over mountains" \
  --aspect-ratio square
```

**Parameters:**
- `--model MODEL_ID` - Required. Model identifier (see Available Models below)
- `--prompt "TEXT"` - Required for Create/Edit models
- `--aspect-ratio RATIO` - Optional. For Create models (default: square)
- `--image PATH` - Required for Edit/Enhance models
- `--output PATH` - Optional. Custom output path (default: auto-generated)

### Examples

**Text-to-Image with Gemini:**
```bash
bash {baseDir}/scripts/generate.sh \
  --model nanobana-create \
  --prompt "cyberpunk city at night, neon lights" \
  --aspect-ratio landscape_16_9
```

**Image Editing:**
```bash
bash {baseDir}/scripts/generate.sh \
  --model flux-edit \
  --prompt "convert to watercolor painting style" \
  --image /path/to/input.jpg
```

**Image Enhancement:**
```bash
bash {baseDir}/scripts/generate.sh \
  --model upscale \
  --image /path/to/input.jpg
```

## Available Models

### 🎨 Create Models (Text-to-Image)

| Model ID | Name | Description |
|----------|------|-------------|
| `nanobana-create` | Gem3/PRE | Gemini 3 Pro Image Preview - Google's state-of-the-art |
| `flux-pro` | FLUX2-C | FLUX 2 Flex - High-quality text-to-image |
| `recraft` | RECRAFT | Vector art capable generation |
| `wan25-create` | WAN25/C | Wan 2.5 Text-to-Image |

**Aspect Ratios:**
- `square` - 1:1 Square
- `portrait_3_4` - 3:4 Portrait
- `portrait_4_5` - 4:5 Portrait
- `landscape_4_3` - 4:3 Landscape
- `landscape_16_9` - 16:9 Landscape

### ✏️ Edit Models (Image-to-Image)

| Model ID | Name | Description |
|----------|------|-------------|
| `gemini` | NANO/BANA1 | Gemini-based editing |
| `nanobana` | NANO/BANA2 | Advanced Gemini editing |
| `kontext` | KONTEXT/M | FLUX.1 Kontext Max |
| `seedream` | SEEDREAM/4 | ByteDance Seedream 4.0 |
| `flux-edit` | FLUX2-E | Multi-image editing |
| `wan25` | WAN25 | Image-to-Image transformation |
| `background-replace` | CHANGE/BG | Background replacement |

### ✨ Enhance Models (Quality Improvement)

| Model ID | Name | Description |
|----------|------|-------------|
| `face-retouch` | RETOUCH | Face retouching |
| `photo-restore` | PHOTO/REST | Photo restoration |
| `face-enhance` | FACE/ENH | Face enhancement |
| `realism` | REALISM | Realism enhancement |
| `text-remove` | TEXT-REMV | Text removal |
| `jpeg-fix` | JPEG/FIX | Super-resolution & 2x upscaling |
| `upscale` | UPSCALE | Real-ESRGAN 4x upscaling |

## Output

Generated images are saved to:
```
{baseDir}/media/
```

Naming format: `{model_id}_{timestamp}.jpg`

Example: `nanobana-create_1737709200.jpg`

## Inline Buttons

The skill provides interactive inline buttons for Telegram:

### Model Selection Buttons

```json
{
  "create": [
    {"text": "Gem3/PRE", "callback": "model:nanobana-create"},
    {"text": "FLUX2-C", "callback": "model:flux-pro"},
    {"text": "RECRAFT", "callback": "model:recraft"},
    {"text": "WAN25/C", "callback": "model:wan25-create"}
  ],
  "edit": [...],
  "enhance": [...]
}
```

Generate button JSON:
```bash
python3 {baseDir}/scripts/generate_buttons.py
```

## Model Configuration Sync

Models are automatically synced from the chip-fai repository:

```bash
cd {baseDir}/repo
git pull origin main
```

The skill will automatically detect new models added to `bot.py`.

## Technical Details

### API Endpoint
```
POST https://chip-fai.vercel.app/api/process-image
```

### Authentication
- Header: `X-Internal-Auth: ai_universe_2024_secure_token_x71276`
- Header: `Authorization: Bearer ai_universe_2024_secure_token_x71276`

### Request Format
```json
{
  "model": "nanobana-create",
  "prompt": "beautiful sunset",
  "aspectRatio": "square",
  "imageData": "data:image/jpeg;base64,..."
}
```

### Response Format
```json
{
  "success": true,
  "image": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

### Timeout
- Default: 180 seconds (3 minutes)
- Some models may take longer for complex prompts

## Error Handling

The skill provides detailed error messages:

- **Invalid model**: Shows available models
- **Missing prompt**: Explains model requirements
- **Missing image**: Requests image upload
- **API errors**: Shows raw API response for debugging

## Troubleshooting

### Submodule not initialized
```bash
cd {baseDir}
git submodule update --init
```

### Model list not updating
```bash
cd {baseDir}/repo
git pull origin main
```

### API authentication failed
Check that `INTERNAL_API_TOKEN` in `scripts/generate.sh` matches the server configuration.

### Generation timeout
Some models take longer. Increase timeout in `generate.sh`:
```bash
--max-time 300  # 5 minutes
```

## Development

### Update models from repository
```bash
cd {baseDir}/repo
git pull origin main
```

### Test model parsing
```bash
python3 {baseDir}/scripts/parse_models.py | jq '.models | keys'
```

### Test button generation
```bash
python3 {baseDir}/scripts/generate_buttons.py | jq '.model_selection'
```

### Manual API test
```bash
curl -X POST https://chip-fai.vercel.app/api/process-image \
  -H "Content-Type: application/json" \
  -H "X-Internal-Auth: ai_universe_2024_secure_token_x71276" \
  -d '{
    "model": "nanobana-create",
    "prompt": "test image",
    "aspectRatio": "square"
  }'
```

## Integration with Clawdbot

The skill integrates seamlessly with Clawdbot's message system:

1. User sends `/gen` command
2. Skill shows category buttons
3. User selects category → Model buttons appear
4. User selects model → Aspect ratio buttons appear (if Create model)
5. User sends prompt text
6. Skill generates image and sends via Telegram

For image editing/enhancement:
1. User uploads image
2. User sends `/gen` command
3. Skill shows Edit/Enhance models only
4. User selects model
5. User sends prompt (if needed)
6. Skill processes and returns result

## Source Repository

Models and configurations are synced from:
https://github.com/evgyur/chip-fai

Current submodule: `{baseDir}/repo/`

---

**Last Updated**: 2026-01-24
**Models**: 18 (4 Create, 7 Edit, 7 Enhance)
**Status**: Production Ready
