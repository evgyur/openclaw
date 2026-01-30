---
name: cryptochart
description: Get cryptocurrency token price and generate candlestick chart. Use when user asks for crypto price, token chart, or sends slash commands like /hype, /token, /btc, /eth, etc.
metadata: {"clawdbot":{"emoji":"📈","requires":{"bins":["python3"]}}}
---

# Crypto Chart

Get cryptocurrency token price and generate candlestick charts for any token.

## Usage

This skill is called by various slash commands:
- `/hype` - HYPE token
- `/token <SYMBOL>` - Any token (e.g., `/token BTC`, `/token ETH`)
- `/btc`, `/eth`, `/sol`, etc. - Popular tokens

## Execution

Call the crypto-price script with the token symbol. If the user includes a duration like `30m`, `3h`, `12h`, or `2d`, pass it as the second argument; default is 24h:

```bash
python3 {baseDir}/../crypto-price/scripts/get_price_chart.py <SYMBOL> [duration]
```

**Examples:**
- `python3 {baseDir}/../crypto-price/scripts/get_price_chart.py HYPE`
- `python3 {baseDir}/../crypto-price/scripts/get_price_chart.py BTC 12h`
- `python3 {baseDir}/../crypto-price/scripts/get_price_chart.py ETH 3h`
- `python3 {baseDir}/../crypto-price/scripts/get_price_chart.py SOL 30m`

Return the JSON output. If `chart_path` is present, attach the PNG along with the text.
Return text exactly as `text_plain` with no extra formatting: no `**`, no markdown, no emoji.
