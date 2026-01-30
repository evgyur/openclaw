---
name: AAVE
description: Slash command for Aave token price + chart. Use when the user sends `/aave` or asks for Aave token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Aave Price

Fetch Aave token price and chart.

## Usage

Command format:
```
/AAVE
/AAVE 12h
/AAVE 3h
/AAVE 30m
/AAVE 2d
```

## Execution

Call the crypto-price script with AAVE symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py AAVE
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py AAVE 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py AAVE 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py AAVE 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py AAVE 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
