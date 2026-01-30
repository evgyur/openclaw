---
name: BNB
description: Slash command for BNB token price + chart. Use when the user sends `/bnb` or asks for BNB token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# BNB Price

Fetch BNB token price and chart.

## Usage

Command format:
```
/BNB
/BNB 12h
/BNB 3h
/BNB 30m
/BNB 2d
```

## Execution

Call the crypto-price script with BNB symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BNB
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BNB 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BNB 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BNB 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BNB 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
