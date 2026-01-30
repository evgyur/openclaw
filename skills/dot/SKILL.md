---
name: DOT
description: Slash command for Polkadot token price + chart. Use when the user sends `/dot` or asks for Polkadot token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Polkadot Price

Fetch Polkadot token price and chart.

## Usage

Command format:
```
/DOT
/DOT 12h
/DOT 3h
/DOT 30m
/DOT 2d
```

## Execution

Call the crypto-price script with DOT symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py DOT
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py DOT 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py DOT 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py DOT 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py DOT 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
