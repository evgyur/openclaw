---
name: token
description: Slash command for any cryptocurrency token price + chart. Use when the user sends `/token <SYMBOL>` (e.g., `/token BTC`, `/token ETH`).
metadata: {"clawdbot":{"emoji":"💰","requires":{"bins":["python3"]}}}
---

# Token Price

Fetch any cryptocurrency token price and chart.

## Usage

Command format:
```
/token BTC
/token ETH
/token SOL 12h
/token DOGE 3h
/token <SYMBOL> [duration]
```

## Execution

Extract the token symbol from the command. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py <SYMBOL> [duration]
```

**Examples:**
- `/token BTC` → `python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BTC`
- `/token ETH 12h` → `python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ETH 12h`
- `/token SOL 3h` → `python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SOL 3h`

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
