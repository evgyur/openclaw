#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEDIA_DIR="$(dirname "$SCRIPT_DIR")/media"
API_URL="${CHIP_FAI_API_URL:-https://chip-fai.vercel.app/api/process-image}"

# Load token from env or .env file
if [[ -z "${CHIP_FAI_API_TOKEN:-}" ]]; then
    ENV_FILE="$(dirname "$SCRIPT_DIR")/.env"
    [[ -f "$ENV_FILE" ]] && source "$ENV_FILE"
fi

TOKEN="${CHIP_FAI_API_TOKEN:-}"
[[ -z "$TOKEN" ]] && { echo "Error: CHIP_FAI_API_TOKEN not set. Create .env from .env.example"; exit 1; }

mkdir -p "$MEDIA_DIR"

MODEL="" PROMPT="" ASPECT_RATIO="" IMAGE_PATH="" OUTPUT_PATH=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --model) MODEL="$2"; shift 2 ;;
        --prompt) PROMPT="$2"; shift 2 ;;
        --aspect-ratio) ASPECT_RATIO="$2"; shift 2 ;;
        --image) IMAGE_PATH="$2"; shift 2 ;;
        --output) OUTPUT_PATH="$2"; shift 2 ;;
        --help|-h)
            cat << EOF
Usage: $0 --model MODEL [--prompt TEXT] [OPTIONS]

Required:
  --model MODEL         Model ID

Optional:
  --prompt TEXT         Prompt (required for create/edit)
  --aspect-ratio RATIO  Ratio for create models
  --image PATH          Input image (edit/enhance)
  --output PATH         Output file (auto-generated if omitted)

Examples:
  $0 --model nanobana-create --prompt "sunset" --aspect-ratio square
  $0 --model upscale --image input.jpg
EOF
            exit 0
            ;;
        *) echo "Unknown: $1"; exit 1 ;;
    esac
done

[[ -z "$MODEL" ]] && { echo "Error: --model required"; exit 1; }

MODELS_JSON=$(python3 "$SCRIPT_DIR/parse_models.py")
MODEL_CFG=$(echo "$MODELS_JSON" | jq -r ".models[\"$MODEL\"]")

[[ "$MODEL_CFG" == "null" ]] && {
    echo "Error: Invalid model '$MODEL'"
    echo "Available:"
    echo "$MODELS_JSON" | jq -r '.models | keys[]'
    exit 1
}

REQUIRES_PROMPT=$(echo "$MODEL_CFG" | jq -r '.requires_prompt')
CATEGORY=$(echo "$MODEL_CFG" | jq -r '.category')
REQUIRES_IMAGE=$(echo "$MODEL_CFG" | jq -r --arg cat "$CATEGORY" '.requires_image // ($cat != "create")')

[[ "$REQUIRES_PROMPT" == "true" && -z "$PROMPT" ]] && { echo "Error: Model requires prompt"; exit 1; }
[[ "$REQUIRES_IMAGE" == "true" && -z "$IMAGE_PATH" ]] && { echo "Error: Model requires image"; exit 1; }
[[ -n "$IMAGE_PATH" && ! -f "$IMAGE_PATH" ]] && { echo "Error: Image not found: $IMAGE_PATH"; exit 1; }

[[ "$CATEGORY" == "create" && -z "$ASPECT_RATIO" ]] && ASPECT_RATIO="square"

IMAGE_DATA=""
[[ -n "$IMAGE_PATH" ]] && IMAGE_DATA="data:image/jpeg;base64,$(base64 -w 0 "$IMAGE_PATH")"

PAYLOAD=$(jq -n \
    --arg model "$MODEL" \
    --arg prompt "$PROMPT" \
    --arg ratio "$ASPECT_RATIO" \
    --arg img "$IMAGE_DATA" \
    '{model: $model, prompt: $prompt}
    + (if $ratio != "" then {aspectRatio: $ratio} else {} end)
    + (if $img != "" then {imageData: $img} else {} end)')

[[ -z "$OUTPUT_PATH" ]] && OUTPUT_PATH="$MEDIA_DIR/$(echo "$MODEL" | tr '/' '_')_$(date +%s).jpg"

# Retry API call up to 3 times
MAX_RETRIES=3
RETRY_COUNT=0

while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
    HTTP_RESP=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "X-Internal-Auth: $TOKEN" \
        -H "Authorization: Bearer $TOKEN" \
        --max-time 180 \
        -d "$PAYLOAD" \
        "$API_URL")
    
    HTTP_CODE=$(echo "$HTTP_RESP" | tail -n 1)
    
    # Success or non-retryable error
    if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "400" ]] || [[ "$HTTP_CODE" == "401" ]] || [[ "$HTTP_CODE" == "403" ]]; then
        break
    fi
    
    # Retryable error (5xx, network issues)
    RETRY_COUNT=$((RETRY_COUNT + 1))
    [[ $RETRY_COUNT -lt $MAX_RETRIES ]] && sleep $((RETRY_COUNT * 2))  # Exponential backoff
done

HTTP_BODY=$(echo "$HTTP_RESP" | head -n -1)
HTTP_CODE=$(echo "$HTTP_RESP" | tail -n 1)

[[ "$HTTP_CODE" != "200" ]] && { echo "Error: HTTP $HTTP_CODE"; echo "$HTTP_BODY"; exit 1; }

IMAGE_URL=$(echo "$HTTP_BODY" | jq -r '.image // .images[0].url // empty')
[[ -z "$IMAGE_URL" ]] && { echo "Error: No image in response"; echo "$HTTP_BODY"; exit 1; }

if [[ "$IMAGE_URL" =~ ^https?:// ]]; then
    curl -sf "$IMAGE_URL" -o "$OUTPUT_PATH" || { echo "Error: Download failed"; exit 1; }
    
    # Validate downloaded file
    FILE_SIZE=$(stat -f%z "$OUTPUT_PATH" 2>/dev/null || stat -c%s "$OUTPUT_PATH" 2>/dev/null)
    [[ "$FILE_SIZE" -lt 1000 ]] && { echo "Error: Downloaded file too small ($FILE_SIZE bytes), likely corrupt"; rm -f "$OUTPUT_PATH"; exit 1; }
else
    echo "$IMAGE_URL" | sed 's/^data:image\/[^;]*;base64,//' | base64 -d > "$OUTPUT_PATH"
fi

echo "$OUTPUT_PATH"
