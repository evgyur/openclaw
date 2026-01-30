---
name: ALGO
description: Slash command for Algorand token price + chart. Use when the user sends `/algo` or asks for Algorand token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Algorand Price

Fetch Algorand token price and chart.

## Usage

Command format:
```
/ALGO
/ALGO 12h
/ALGO 3h
/ALGO 30m
/ALGO 2d
```

## Execution

Call the crypto-price script with ALGO symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ALGO
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ALGO 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ALGO 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ALGO 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ALGO 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
