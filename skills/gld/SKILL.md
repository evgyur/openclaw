---
name: GLD
description: Slash command for GLD price + chart. Use when the user sends `/gld` or asks for GLD price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# GLD Price

Fetch GLD price and chart.

## Usage

Command format:
```
/GLD
/GLD 12h
/GLD 3h
/GLD 30m
/GLD 2d
```

## Execution

Call the crypto-price script with GOLD-USDC symbol (Hyperliquid). If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py GOLD-USDC
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py GOLD-USDC 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py GOLD-USDC 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py GOLD-USDC 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py GOLD-USDC 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
