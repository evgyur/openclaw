---
name: BTC
description: Slash command for Bitcoin token price + chart. Use when the user sends `/btc` or asks for Bitcoin token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Bitcoin Price

Fetch Bitcoin token price and chart.

## Usage

Command format:
```
/BTC
/BTC 12h
/BTC 3h
/BTC 30m
/BTC 2d
```

## Execution

Call the crypto-price script with BTC symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BTC
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BTC 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BTC 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BTC 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BTC 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
