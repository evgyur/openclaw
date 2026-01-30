---
name: ATOM
description: Slash command for Cosmos token price + chart. Use when the user sends `/atom` or asks for Cosmos token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Cosmos Price

Fetch Cosmos token price and chart.

## Usage

Command format:
```
/ATOM
/ATOM 12h
/ATOM 3h
/ATOM 30m
/ATOM 2d
```

## Execution

Call the crypto-price script with ATOM symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ATOM
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ATOM 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ATOM 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ATOM 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ATOM 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
