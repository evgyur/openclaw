---
name: DASH
description: Slash command for Dash token price + chart. Use when the user sends `/dash` or asks for Dash token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Dash Price

Fetch Dash token price and chart.

## Usage

Command format:
```
/DASH
/DASH 12h
/DASH 3h
/DASH 30m
/DASH 2d
```

## Execution

Call the crypto-price script with DASH symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py DASH
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py DASH 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py DASH 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py DASH 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py DASH 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
