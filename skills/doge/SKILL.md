---
name: DOGE
description: Slash command for Dogecoin token price + chart. Use when the user sends `/doge` or asks for Dogecoin token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Dogecoin Price

Fetch Dogecoin token price and chart.

## Usage

Command format:
```
/DOGE
/DOGE 12h
/DOGE 3h
/DOGE 30m
/DOGE 2d
```

## Execution

Call the crypto-price script with DOGE symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py DOGE
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py DOGE 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py DOGE 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py DOGE 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py DOGE 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
