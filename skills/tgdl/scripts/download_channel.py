#!/usr/bin/env python3
"""
Download all messages from a Telegram channel or chat using Telethon.
Uses the same session credentials as telegram-mcp-api.

Usage:
    python3 download_channel.py <channel_or_chat_username> [output_file]

Examples:
    python3 download_channel.py y22_trades
    python3 download_channel.py hyperliquid_ru
    python3 download_channel.py cryptonews $HOME/data/crypto.json
"""
import os
import sys
import asyncio
import json
from pathlib import Path
from datetime import datetime

from telethon import TelegramClient
from telethon.sessions import StringSession

# Credentials (same as biohacking/telegram-mcp-api)
API_ID = 27317240
API_HASH = "83217ba67036c2b2bb3c20f1b691f593"
SESSION_STRING = "1ApWapzMBu0mkSiiL26y7V1Ks3EksMVffNdxhdJvMJKW2V-1Z5ircFHp4JXk-A1NZoNSFt8HpCyIdEVeB-etUxt78QekcUXlAETUtYcj7SRu_UFDQiFhlNgDMgK4yZj-613GjvvyHbi3_c7KOHYQvI99KgQ9EpzzA5saL6YRacxnSWmooi-qROKVDBShmx17gcp--0mHxC9flqyioblRsBrv-56lhgiEpOHxxvTOYMsyfslV7AQMNPnRFXRKfgNw9q4Rw0Da54rgO7dzd2LAUb5CJFL0s3zoSRkvSvYI-Kxj2Cb7qN6A2U6DkVEu7jSfyChu8RhqQu6APZJB7kadVVC3rNnsunxM="

# Default output directory
DEFAULT_OUTPUT_DIR = Path(__file__).parent.parent / "data"

async def download_channel(channel_username, output_file=None):
    """Download all messages from a Telegram channel or chat."""
    
    # Prepare output path
    if output_file is None:
        DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        output_file = DEFAULT_OUTPUT_DIR / f"{channel_username}_messages.json"
    else:
        output_file = Path(output_file)
        output_file.parent.mkdir(parents=True, exist_ok=True)
    
    client = TelegramClient(StringSession(SESSION_STRING), API_ID, API_HASH)
    
    await client.start()
    print(f"✓ Connected to Telegram")
    
    try:
        # Get channel entity
        channel = await client.get_entity(channel_username)
        print(f"✓ Channel: {channel.title}")
        print(f"  ID: {channel.id}")
        if hasattr(channel, 'participants_count') and channel.participants_count:
            print(f"  Participants: {channel.participants_count:,}")
        
        messages = []
        count = 0
        
        print(f"\n⏳ Downloading messages...")
        
        async for message in client.iter_messages(channel, limit=None):
            count += 1
            if count % 100 == 0:
                print(f"  {count:,} messages downloaded...")
            
            msg_data = {
                'id': message.id,
                'date': message.date.isoformat() if message.date else None,
                'text': message.text or '',
                'views': message.views,
                'forwards': message.forwards,
                'reply_to': message.reply_to_msg_id if message.reply_to else None,
            }
            messages.append(msg_data)
        
        # Reverse to chronological order (oldest first)
        messages.reverse()
        
        # Save to JSON
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(messages, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ Total messages: {count:,}")
        print(f"✅ Saved to: {output_file}")
        
        return output_file
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
        
    finally:
        await client.disconnect()

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 download_channel.py <channel_or_chat_username> [output_file]")
        print("\nExamples:")
        print("  python3 download_channel.py y22_trades")
        print("  python3 download_channel.py hyperliquid_ru")
        print("  python3 download_channel.py cryptonews $HOME/data/crypto.json")
        sys.exit(1)
    
    channel_username = sys.argv[1].lstrip('@')
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    asyncio.run(download_channel(channel_username, output_file))

if __name__ == '__main__':
    main()
