#!/usr/bin/env python3
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("https://www.bestchange.ru/tether-trc20-to-cash-ruble.html", timeout=30000)
    
    # Wait a bit
    page.wait_for_timeout(5000)
    
    # Get page content
    html = page.content()
    
    # Check for table structures
    print("=== Checking for table rows ===")
    print("tr elements:", len(page.query_selector_all('tr')))
    print("tr with id:", len(page.query_selector_all('tr[id]')))
    
    # Check for common BestChange elements
    print("\n=== Checking BestChange elements ===")
    print("div.rates_tab:", len(page.query_selector_all('div.rates_tab')))
    print("table:", len(page.query_selector_all('table')))
    print("#content_table:", page.query_selector('#content_table') is not None)
    
    # Try to find any rates
    print("\n=== Looking for rate-like numbers ===")
    all_text = page.inner_text('body')
    import re
    rates = re.findall(r'\b7[0-9]\.\d{2,4}\b', all_text)
    print(f"Found {len(rates)} potential rates:", rates[:10])
    
    browser.close()
