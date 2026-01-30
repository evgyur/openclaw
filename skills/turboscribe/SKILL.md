---
name: turboscribe
description: Transcribe audio/video files using TurboScribe.ai via Browser Relay. Use when user wants to transcribe large audio/video files, convert speech to text, or get transcriptions. Triggers: "/ts", "transcribe", "транскрибация", "расшифровка", "speech to text", "turboscribe".
---

# TurboScribe Transcription

Automates TurboScribe.ai for transcribing large audio/video files via Browser Relay.

## Prerequisites

- TurboScribe Unlimited account
- Browser Relay extension in Chrome
- User logged into turboscribe.ai

## Quick Start

1. User provides audio/video file path
2. Open TurboScribe in Chrome, click Browser Relay icon (badge "ON")
3. Tell Clawd to transcribe

## Workflow

### Step 1: Verify Connection

```
browser action=status profile=chrome
```

If `cdpReady: false`, ask user to attach tab via Browser Relay.

### Step 2: Navigate to Dashboard

```
browser action=navigate targetUrl="https://turboscribe.ai/dashboard" profile=chrome
```

### Step 3: Open Upload Modal

Click "Transcribe Files" button:
```
browser action=snapshot profile=chrome
# Find button with text "Transcribe Files" or "TRANSCRIBE FILES"
browser action=act profile=chrome request={"kind":"click","ref":"<transcribe-button-ref>"}
```

### Step 4: Upload File

Modal appears with:
- **Dropzone**: Click "+" or drag file
- **Audio Language**: Dropdown (default: Auto-detect)
- **Transcription Mode**: Cheetah (Fast) | Dolphin (Balanced) | Whale (Most Accurate)

For file upload via browser:
```
browser action=upload profile=chrome paths=["<absolute-file-path>"]
```

### Step 5: Configure Settings

**Language**: Default is Russian — do NOT change unless user explicitly requests another language (e.g., "transcribe in English", "английский аудио").

**Mode**: Always use **Whale** (Most Accurate) for Unlimited users.

**Speaker Recognition**: ALWAYS enable with auto-detect number of speakers. Click "Speaker Recognition & More Settings" to expand, then enable speaker detection with automatic count.

### Step 6: Start Transcription

Click "TRANSCRIBE" button:
```
browser action=act profile=chrome request={"kind":"click","ref":"<transcribe-btn-ref>"}
```

### Step 7: Monitor Progress

Poll dashboard every 30-60 seconds:
```
browser action=snapshot profile=chrome
```

Look for:
- Progress percentage
- Status: "Processing..." → "Ready" ✓
- Green checkmark in Status column

### Step 8: Extract Transcript

Click on completed transcript row to open it:
```
browser action=act profile=chrome request={"kind":"click","ref":"<transcript-link-ref>"}
```

On transcript page:
1. Click **Download** button
2. Select **TXT** format
3. **IMPORTANT**: Enable "Include Timestamps" checkbox before downloading
4. Save file

Export settings:
- Format: TXT (plain text with timestamps)
- Timestamps: ✅ ENABLED (mandatory)

### Step 9: Save Result

```
$CLAWD_WORKSPACE/transcripts/<filename>_transcript.txt
```

## UI Element References

### Dashboard
- "Transcribe Files" button (top right, blue)
- Table with columns: Name, Uploaded, Duration, Mode (🐳=Whale), Status

### Upload Modal
- Dropzone: "+" button for file selection
- Language dropdown: "Audio Language"
- Mode buttons: Cheetah | Dolphin | **Whale**
- "Speaker Recognition & More Settings" - expandable
- "TRANSCRIBE" button (blue, bottom)

### Transcript Page
- Transcript text in main content area
- Download options: TXT, SRT, VTT, DOCX
- Copy button

## Supported Formats

Audio: MP3, WAV, M4A, FLAC, OGG, WMA, AAC
Video: MP4, MOV, AVI, MKV, WebM

## Limits

- Unlimited plan: Up to 10 hours per file
- Whale mode: ~1 min processing per 1 min audio

## Error Handling

- **Cloudflare**: User must pass challenge manually
- **Session expired**: Re-login in Chrome
- **Upload failed**: Check file format/size
- **Relay disconnected**: Re-attach tab via extension icon
