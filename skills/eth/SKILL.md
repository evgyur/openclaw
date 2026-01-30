---
name: ETH
description: Slash command for Ethereum token price + chart. Use when the user sends `/eth` or asks for Ethereum token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Ethereum Price

Fetch Ethereum token price and chart.

## Usage

Command format:
```
/ETH
/ETH 12h
/ETH 3h
/ETH 30m
/ETH 2d
```

## Execution

Call the crypto-price script with ETH symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ETH
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ETH 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ETH 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ETH 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ETH 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
