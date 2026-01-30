---
name: SOL
description: Slash command for Solana token price + chart. Use when the user sends `/sol` or asks for Solana token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Solana Price

Fetch Solana token price and chart.

## Usage

Command format:
```
/SOL
/SOL 12h
/SOL 3h
/SOL 30m
/SOL 2d
```

## Execution

Call the crypto-price script with SOL symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SOL
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SOL 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SOL 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SOL 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SOL 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
