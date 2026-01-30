---
name: counter-check
description: "Injects self-review counter-check reminder on session bootstrap"
metadata: {"clawdbot":{"emoji":"🔍","events":["agent:bootstrap"]}}
---

# Counter-Check Hook

This hook injects a self-review counter-check reminder into the system prompt on every session start.

## What It Does

1. Listens for `agent:bootstrap` events
2. Reads recent MISS entries from `.learnings/LEARNINGS.md`
3. If entries exist, adds a counter-check advisory to the bootstrap files

## Purpose

Ensures the agent reviews past mistakes before starting new work, preventing repeated errors.
