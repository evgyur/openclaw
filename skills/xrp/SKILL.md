---
name: XRP
description: Slash command for Ripple token price + chart. Use when the user sends `/xrp` or asks for Ripple token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Ripple Price

Fetch Ripple token price and chart.

## Usage

Command format:
```
/XRP
/XRP 12h
/XRP 3h
/XRP 30m
/XRP 2d
```

## Execution

Call the crypto-price script with XRP symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py XRP
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py XRP 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py XRP 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py XRP 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py XRP 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
