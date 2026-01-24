#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEDIA_DIR="$(dirname "$SCRIPT_DIR")/media"
API_URL="https://chip-fai.vercel.app/api/process-image"
TOKEN="ai_universe_2024_secure_token_x71276"

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
REQUIRES_IMAGE=$(echo "$MODEL_CFG" | jq -r --arg cat "$CATEGORY" '.requires_image // ($cat != "create")')  # Default true except for create

[[ "$REQUIRES_PROMPT" == "true" && -z "$PROMPT" ]] && { echo "Error: Model requires prompt"; exit 1; }
[[ "$REQUIRES_IMAGE" == "true" && -z "$IMAGE_PATH" ]] && { echo "Error: Model requires image"; exit 1; }
[[ -n "$IMAGE_PATH" && ! -f "$IMAGE_PATH" ]] && { echo "Error: Image not found: $IMAGE_PATH"; exit 1; }

[[ "$CATEGORY" == "create" && -z "$ASPECT_RATIO" ]] && ASPECT_RATIO="square"

IMAGE_DATA=""
if [[ -n "$IMAGE_PATH" ]]; then
    echo "Converting image to base64..."
    IMAGE_DATA="data:image/jpeg;base64,$(base64 -w 0 "$IMAGE_PATH")"
fi

PAYLOAD=$(jq -n \
    --arg model "$MODEL" \
    --arg prompt "$PROMPT" \
    --arg ratio "$ASPECT_RATIO" \
    --arg img "$IMAGE_DATA" \
    '{model: $model, prompt: $prompt}
    + (if $ratio != "" then {aspectRatio: $ratio} else {} end)
    + (if $img != "" then {imageData: $img} else {} end)')

[[ -z "$OUTPUT_PATH" ]] && OUTPUT_PATH="$MEDIA_DIR/$(echo "$MODEL" | tr '/' '_')_$(date +%s).jpg"

echo "Generating with $MODEL..."
[[ -n "$PROMPT" ]] && echo "Prompt: $PROMPT"
[[ -n "$ASPECT_RATIO" ]] && echo "Ratio: $ASPECT_RATIO"

HTTP_RESP=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "X-Internal-Auth: $TOKEN" \
    -H "Authorization: Bearer $TOKEN" \
    --max-time 180 \
    -d "$PAYLOAD" \
    "$API_URL")

HTTP_BODY=$(echo "$HTTP_RESP" | head -n -1)
HTTP_CODE=$(echo "$HTTP_RESP" | tail -n 1)

[[ "$HTTP_CODE" != "200" ]] && { echo "Error: HTTP $HTTP_CODE"; echo "$HTTP_BODY"; exit 1; }

SUCCESS=$(echo "$HTTP_BODY" | jq -r '.success')
[[ "$SUCCESS" != "true" ]] && { echo "Error: Generation failed"; echo "$HTTP_BODY"; exit 1; }

IMAGE_B64=$(echo "$HTTP_BODY" | jq -r '.image')
[[ -z "$IMAGE_B64" || "$IMAGE_B64" == "null" ]] && { echo "Error: No image in response"; exit 1; }

echo "$IMAGE_B64" | sed 's/^data:image\/[^;]*;base64,//' | base64 -d > "$OUTPUT_PATH"

echo "Success! Saved to: $OUTPUT_PATH"
echo "$OUTPUT_PATH"
