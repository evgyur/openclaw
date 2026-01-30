---
name: BCH
description: Slash command for Bitcoin Cash token price + chart. Use when the user sends `/bch` or asks for Bitcoin Cash token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Bitcoin Cash Price

Fetch Bitcoin Cash token price and chart.

## Usage

Command format:
```
/BCH
/BCH 12h
/BCH 3h
/BCH 30m
/BCH 2d
```

## Execution

Call the crypto-price script with BCH symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BCH
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BCH 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BCH 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BCH 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BCH 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
