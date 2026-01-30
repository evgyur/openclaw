---
name: UNI
description: Slash command for Uniswap token price + chart. Use when the user sends `/uni` or asks for Uniswap token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Uniswap Price

Fetch Uniswap token price and chart.

## Usage

Command format:
```
/UNI
/UNI 12h
/UNI 3h
/UNI 30m
/UNI 2d
```

## Execution

Call the crypto-price script with UNI symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py UNI
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py UNI 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py UNI 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py UNI 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py UNI 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
