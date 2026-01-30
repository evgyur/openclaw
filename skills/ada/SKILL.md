---
name: ADA
description: Slash command for Cardano token price + chart. Use when the user sends `/ada` or asks for Cardano token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Cardano Price

Fetch Cardano token price and chart.

## Usage

Command format:
```
/ADA
/ADA 12h
/ADA 3h
/ADA 30m
/ADA 2d
```

## Execution

Call the crypto-price script with ADA symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ADA
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ADA 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ADA 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ADA 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ADA 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
