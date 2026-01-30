---
name: hype
description: Slash command for HYPE token price + chart. Use when the user sends `/hype` or asks for HYPE token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# HYPE Price

Fetch HYPE (Hyperliquid) token price and chart.

## Usage

Command format:
```
/hype
/hype 12h
/hype 3h
/hype 30m
/hype 2d
```

## Execution

Call the cryptochart skill with HYPE symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py HYPE
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py HYPE 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py HYPE 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py HYPE 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py HYPE 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
If the user did not specify a duration, run the command immediately with the default 24h (do not ask a follow‑up).
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
