#!/bin/bash
set -euo pipefail

# chip-fai API client for image generation
# Full production implementation with error handling

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
MEDIA_DIR="$SKILL_DIR/media"

# API configuration
API_URL="https://chip-fai.vercel.app/api/process-image"
INTERNAL_API_TOKEN="ai_universe_2024_secure_token_x71276"

# Ensure media directory exists
mkdir -p "$MEDIA_DIR"

# Parse command line arguments
MODEL=""
PROMPT=""
ASPECT_RATIO=""
IMAGE_PATH=""
OUTPUT_PATH=""

usage() {
    cat << EOF
Usage: $0 --model MODEL --prompt "PROMPT" [OPTIONS]

Required:
  --model MODEL         Model ID (e.g., nanobana-create, flux-pro, etc.)
  --prompt "PROMPT"     Text prompt for generation

Optional:
  --aspect-ratio RATIO  Aspect ratio for create models (square, portrait_3_4, etc.)
  --image PATH          Input image path (for edit/enhance models)
  --output PATH         Output file path (default: auto-generated in media/)

Examples:
  # Text-to-image with Gemini
  $0 --model nanobana-create --prompt "beautiful sunset" --aspect-ratio square

  # Image editing with FLUX
  $0 --model flux-edit --prompt "make it cartoon style" --image input.jpg

  # Image enhancement
  $0 --model upscale --image input.jpg

EOF
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --model)
            MODEL="$2"
            shift 2
            ;;
        --prompt)
            PROMPT="$2"
            shift 2
            ;;
        --aspect-ratio)
            ASPECT_RATIO="$2"
            shift 2
            ;;
        --image)
            IMAGE_PATH="$2"
            shift 2
            ;;
        --output)
            OUTPUT_PATH="$2"
            shift 2
            ;;
        --help|-h)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Validate required parameters
if [[ -z "$MODEL" ]]; then
    echo "Error: --model is required"
    usage
fi

# Load model configuration
MODELS_JSON=$(python3 "$SCRIPT_DIR/parse_models.py")
MODEL_CONFIG=$(echo "$MODELS_JSON" | jq -r ".models[\"$MODEL\"]")

if [[ "$MODEL_CONFIG" == "null" ]]; then
    echo "Error: Invalid model '$MODEL'"
    echo "Available models:"
    echo "$MODELS_JSON" | jq -r '.models | keys[]'
    exit 1
fi

REQUIRES_PROMPT=$(echo "$MODEL_CONFIG" | jq -r '.requires_prompt')
REQUIRES_IMAGE=$(echo "$MODEL_CONFIG" | jq -r '.requires_image')
MODEL_NAME=$(echo "$MODEL_CONFIG" | jq -r '.name')
CATEGORY=$(echo "$MODEL_CONFIG" | jq -r '.category')

# Validate prompt
if [[ "$REQUIRES_PROMPT" == "true" ]] && [[ -z "$PROMPT" ]]; then
    echo "Error: Model '$MODEL_NAME' requires a prompt"
    exit 1
fi

# Validate image
if [[ "$REQUIRES_IMAGE" == "true" ]] && [[ -z "$IMAGE_PATH" ]]; then
    echo "Error: Model '$MODEL_NAME' requires an input image"
    exit 1
fi

if [[ -n "$IMAGE_PATH" ]] && [[ ! -f "$IMAGE_PATH" ]]; then
    echo "Error: Image file not found: $IMAGE_PATH"
    exit 1
fi

# Validate aspect ratio for create models
if [[ "$CATEGORY" == "create" ]] && [[ -z "$ASPECT_RATIO" ]]; then
    # Set default aspect ratio
    ASPECT_RATIO="square"
    echo "Info: Using default aspect ratio: $ASPECT_RATIO"
fi

# Convert image to base64 if provided
IMAGE_DATA=""
if [[ -n "$IMAGE_PATH" ]]; then
    echo "Converting image to base64..."
    IMAGE_BASE64=$(base64 -w 0 "$IMAGE_PATH")
    IMAGE_DATA="data:image/jpeg;base64,$IMAGE_BASE64"
fi

# Build JSON payload
PAYLOAD=$(jq -n \
    --arg model "$MODEL" \
    --arg prompt "$PROMPT" \
    --arg aspectRatio "$ASPECT_RATIO" \
    --arg imageData "$IMAGE_DATA" \
    '{
        model: $model,
        prompt: $prompt
    } + (if $aspectRatio != "" then {aspectRatio: $aspectRatio} else {} end)
      + (if $imageData != "" then {imageData: $imageData} else {} end)')

# Generate output filename if not provided
if [[ -z "$OUTPUT_PATH" ]]; then
    TIMESTAMP=$(date +%s)
    SANITIZED_MODEL=$(echo "$MODEL" | tr '/' '_')
    OUTPUT_PATH="$MEDIA_DIR/${SANITIZED_MODEL}_${TIMESTAMP}.jpg"
fi

# Make API request
echo "Generating with $MODEL_NAME..."
echo "Prompt: $PROMPT"
if [[ -n "$ASPECT_RATIO" ]]; then
    echo "Aspect Ratio: $ASPECT_RATIO"
fi

HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "X-Internal-Auth: $INTERNAL_API_TOKEN" \
    -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
    --max-time 180 \
    -d "$PAYLOAD" \
    "$API_URL")

HTTP_BODY=$(echo "$HTTP_RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -n 1)

if [[ "$HTTP_CODE" != "200" ]]; then
    echo "Error: API request failed with status $HTTP_CODE"
    echo "Response: $HTTP_BODY"
    exit 1
fi

# Parse response
SUCCESS=$(echo "$HTTP_BODY" | jq -r '.success')

if [[ "$SUCCESS" != "true" ]]; then
    echo "Error: Generation failed"
    echo "Response: $HTTP_BODY"
    exit 1
fi

# Extract base64 image
IMAGE_BASE64=$(echo "$HTTP_BODY" | jq -r '.image')

if [[ -z "$IMAGE_BASE64" ]] || [[ "$IMAGE_BASE64" == "null" ]]; then
    echo "Error: No image data in response"
    echo "Response: $HTTP_BODY"
    exit 1
fi

# Remove data URL prefix if present
IMAGE_BASE64=$(echo "$IMAGE_BASE64" | sed 's/^data:image\/[^;]*;base64,//')

# Save image
echo "$IMAGE_BASE64" | base64 -d > "$OUTPUT_PATH"

echo "Success! Image saved to: $OUTPUT_PATH"

# Output path for programmatic use
echo "$OUTPUT_PATH"
