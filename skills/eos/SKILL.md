---
name: EOS
description: Slash command for EOS token price + chart. Use when the user sends `/eos` or asks for EOS token price.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# EOS Price

Fetch EOS token price and chart.

## Usage

Command format:
```
/EOS
/EOS 12h
/EOS 3h
/EOS 30m
/EOS 2d
```

## Execution

Call the crypto-price script with EOS symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py EOS
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py EOS 12h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py EOS 3h
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py EOS 30m
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py EOS 2d
```

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
