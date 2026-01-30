---
name: ZEC
description: Slash command for Zcash token price + chart. Use when the user sends `/zec` or asks for Zcash token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Zcash Price

Fetch Zcash token price and chart.

## Usage

Command format:
```
/ZEC
/ZEC 12h
/ZEC 3h
/ZEC 30m
/ZEC 2d
```

## Execution

Call the crypto-price script with ZEC symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ZEC
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ZEC 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ZEC 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ZEC 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ZEC 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
