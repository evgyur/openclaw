---
name: XMR
description: Slash command for Monero token price + chart. Use when the user sends `/xmr` or asks for Monero token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Monero Price

Fetch Monero token price and chart.

## Usage

Command format:
```
/XMR
/XMR 12h
/XMR 3h
/XMR 30m
/XMR 2d
```

## Execution

Call the crypto-price script with XMR symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py XMR
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py XMR 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py XMR 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py XMR 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py XMR 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
