---
name: LTC
description: Slash command for Litecoin token price + chart. Use when the user sends `/ltc` or asks for Litecoin token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Litecoin Price

Fetch Litecoin token price and chart.

## Usage

Command format:
```
/LTC
/LTC 12h
/LTC 3h
/LTC 30m
/LTC 2d
```

## Execution

Call the crypto-price script with LTC symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py LTC
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py LTC 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py LTC 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py LTC 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py LTC 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
