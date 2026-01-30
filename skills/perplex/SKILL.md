---
name: perplex
description: Search using Perplexity AI via browser relay. Use when user asks to search with Perplexity, needs AI-powered search results, or wants research using Perplexity. Triggers include "perplexity search", "search with perplex", "use perplexity", "perplex".
---

# Perplex - Perplexity AI Search

Search using Perplexity AI through Clawdbot's browser tool with chrome profile.

## Prerequisites

- Chrome extension (Clawdbot Browser Relay) attached to a tab (badge ON)
- Internet connection to perplexity.ai

## Usage

Use the browser tool directly with profile="chrome" to perform searches.

**Workflow:**

1. Get available tabs to find targetId:
```
browser action=tabs profile=chrome
```

2. Navigate to Perplexity (if not already there):
```
browser action=open profile=chrome targetUrl=https://www.perplexity.ai
```

3. Get page snapshot to find input field:
```
browser action=snapshot profile=chrome refs=aria
```

4. Click the textbox to focus (ref from snapshot, usually e125):
```
browser action=act profile=chrome request={kind=click, ref=e125}
```

5. Type the search query:
```
browser action=act profile=chrome targetId=<from-tabs> request={kind=type, ref=e125, text="your query"}
```

6. Submit by pressing Enter:
```
browser action=act profile=chrome targetId=<from-tabs> request={kind=press, key=Enter}
```

7. Wait 10 seconds for Perplexity AI to generate response

8. Get results in AI format:
```
browser action=snapshot profile=chrome targetId=<from-tabs> snapshotFormat=ai
```

9. Extract answer text and sources from the snapshot

10. Present formatted results to user

## Important

- Always use `profile=chrome` (not "clawd") for Chrome extension relay
- Keep the same targetId throughout the workflow for stability
- Wait adequate time for Perplexity's AI generation (10s minimum)
- Results include both answer and sources

## Error Handling

Common issues:
- **No tabs available**: Chrome extension not attached - ask user to click toolbar icon (badge must show ON)
- **Navigation timeout**: Network issue or slow connection
- **Cannot type query**: Page structure changed or input not found
- **Empty results**: Query too complex or rate limited

If errors occur:
1. Verify Chrome extension is attached (badge ON in toolbar)
2. Try refreshing the Perplexity page
3. Simplify the query
4. Check perplexity.ai accessibility in browser
