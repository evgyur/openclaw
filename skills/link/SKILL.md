---
name: LINK
description: Slash command for Chainlink token price + chart. Use when the user sends `/link` or asks for Chainlink token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Chainlink Price

Fetch Chainlink token price and chart.

## Usage

Command format:
```
/LINK
/LINK 12h
/LINK 3h
/LINK 30m
/LINK 2d
```

## Execution

Call the crypto-price script with LINK symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py LINK
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py LINK 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py LINK 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py LINK 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py LINK 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
