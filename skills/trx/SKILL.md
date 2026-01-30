---
name: TRX
description: Slash command for TRON token price + chart. Use when the user sends `/trx` or asks for TRON token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# TRON Price

Fetch TRON token price and chart.

## Usage

Command format:
```
/TRX
/TRX 12h
/TRX 3h
/TRX 30m
/TRX 2d
```

## Execution

Call the crypto-price script with TRX symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py TRX
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py TRX 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py TRX 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py TRX 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py TRX 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
