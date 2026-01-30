#!/usr/bin/env python3
"""
BestChange.ru rate checker via Playwright
Fetches top-10 exchange rates for USDT TRC20 → RUB cash Moscow
"""

import sys
import json
import re
from playwright.sync_api import sync_playwright

def get_usdt_rub_cash_moscow():
    """
    Fetch USDT TRC20 → RUB cash rates from BestChange using Playwright
    Returns top-10 average, min, max
    """
    
    url = "https://www.bestchange.ru/tether-trc20-to-cash-ruble.html"
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            # Navigate to page
            page.goto(url, timeout=30000, wait_until='domcontentloaded')
            
            # Wait for table to load
            page.wait_for_selector('#content_table', timeout=20000)
            page.wait_for_timeout(3000)  # Additional wait for JS rendering
            
            # Extract all text and find rates
            body_text = page.inner_text('body')
            
            # Find all rates matching pattern 7X.XXXX
            rate_matches = re.findall(r'\b(7[0-9]\.\d{2,4})\b', body_text)
            
            rates = []
            for match in rate_matches:
                try:
                    rate = float(match)
                    if 70 <= rate <= 85:  # Sanity check for USDT/RUB
                        rates.append(rate)
                except:
                    continue
            
            browser.close()
            
            if not rates:
                return {
                    "error": "No rates found",
                    "text": "❌ Курсы не найдены на странице"
                }
            
            # Get top-10 (highest rates = best for selling USDT)
            top10 = sorted(rates, reverse=True)[:10]
            
            average = sum(top10) / len(top10)
            min_rate = min(top10)
            max_rate = max(top10)
            
            text = f"""💸 USDT TRC20 → RUB наличные

Средняя (топ-10): {average:.2f} ₽
Диапазон: {min_rate:.2f} - {max_rate:.2f} ₽
Обменников: {len(top10)}

🔗 {url}"""
            
            return {
                "average": round(average, 2),
                "min": round(min_rate, 2),
                "max": round(max_rate, 2),
                "count": len(top10),
                "url": url,
                "text": text
            }
    
    except Exception as e:
        return {
            "error": str(e),
            "text": f"❌ Ошибка при загрузке BestChange: {str(e)}"
        }

def main():
    command = sys.argv[1] if len(sys.argv) > 1 else "cash"
    
    if command == "cash":
        result = get_usdt_rub_cash_moscow()
    else:
        result = {
            "error": f"Unknown command: {command}",
            "text": f"❌ Неизвестная команда: {command}\n\nДоступные команды:\n• cash — USDT TRC20 → RUB наличные"
        }
    
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
