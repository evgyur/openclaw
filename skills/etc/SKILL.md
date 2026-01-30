---
name: ETC
description: Slash command for Ethereum Classic token price + chart. Use when the user sends `/etc` or asks for Ethereum Classic token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Ethereum Classic Price

Fetch Ethereum Classic token price and chart.

## Usage

Command format:
```
/ETC
/ETC 12h
/ETC 3h
/ETC 30m
/ETC 2d
```

## Execution

Call the crypto-price script with ETC symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ETC
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ETC 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ETC 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ETC 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ETC 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
