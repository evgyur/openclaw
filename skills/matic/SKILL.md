---
name: MATIC
description: Slash command for Polygon token price + chart. Use when the user sends `/matic` or asks for Polygon token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Polygon Price

Fetch Polygon token price and chart.

## Usage

Command format:
```
/MATIC
/MATIC 12h
/MATIC 3h
/MATIC 30m
/MATIC 2d
```

## Execution

Call the crypto-price script with MATIC symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py MATIC
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py MATIC 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py MATIC 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py MATIC 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py MATIC 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
