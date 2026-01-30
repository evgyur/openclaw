---
name: SHIB
description: Slash command for Shiba Inu token price + chart. Use when the user sends `/shib` or asks for Shiba Inu token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Shiba Inu Price

Fetch Shiba Inu token price and chart.

## Usage

Command format:
```
/SHIB
/SHIB 12h
/SHIB 3h
/SHIB 30m
/SHIB 2d
```

## Execution

Call the crypto-price script with SHIB symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SHIB
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SHIB 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SHIB 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SHIB 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SHIB 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
