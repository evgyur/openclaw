# Scrum Master Skill for Clawdbot 🎯

Personal scrum master with coaching focus. Integrates with Google Tasks and Calendar.

## Features

- **Daily Standups** — Morning check-ins with 3 questions
- **Task Management** — Google Tasks sync with Eisenhower prioritization
- **Weekly Reviews** — Progress tracking and pattern analysis
- **Coaching** — Smart suggestions when tasks get stuck
- **Calendar Blocking** — Auto time-blocking for important tasks

## Installation

```bash
clawdhub install scrum-master
```

## Requirements

- `gog` CLI with Google Tasks & Calendar access
- `jq` for JSON processing

## Setup

1. Authenticate gog with your Google account:
```bash
gog auth add you@gmail.com --services tasks,calendar
```

2. Set environment variable for non-interactive use:
```bash
export GOG_KEYRING_PASSWORD="your-password"
```

## Usage

The skill activates via cron jobs:
- **09:00** — Morning standup
- **21:00** — Evening check-in
- **Sunday 19:00** — Weekly review

Or trigger manually: "давай стендап" / "покажи задачи" / "недельный обзор"

## Author

@evgyur

## License

MIT
