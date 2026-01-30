---
name: SLV
description: Slash command for SLV price + chart. Use when the user sends `/slv` or asks for SLV price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# SLV Price

Fetch SLV price and chart.

## Usage

Command format:
```
/SLV
/SLV 12h
/SLV 3h
/SLV 30m
/SLV 2d
```

## Execution

Call the crypto-price script with SILVER-USDC symbol (Hyperliquid). If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SILVER-USDC
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SILVER-USDC 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SILVER-USDC 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SILVER-USDC 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SILVER-USDC 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
