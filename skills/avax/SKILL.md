---
name: AVAX
description: Slash command for Avalanche token price + chart. Use when the user sends `/avax` or asks for Avalanche token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Avalanche Price

Fetch Avalanche token price and chart.

## Usage

Command format:
```
/AVAX
/AVAX 12h
/AVAX 3h
/AVAX 30m
/AVAX 2d
```

## Execution

Call the crypto-price script with AVAX symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py AVAX
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py AVAX 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py AVAX 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py AVAX 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py AVAX 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
