#!/usr/bin/env python3
"""Parse MODEL_CONFIGS from chip-fai bot.py"""

import re
import json
import sys
from pathlib import Path

def extract_dict(content, var_name):
    """Extract Python dict by variable name, returns dict content string"""
    match = re.search(rf'{var_name}\s*=\s*\{{', content)
    if not match:
        return None
    
    start = match.end() - 1
    brace_count = 0
    
    for i, char in enumerate(content[start:], start):
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                return content[start:i + 1]
    
    raise ValueError(f"Unbalanced braces in {var_name}")

def parse_bool(text, key):
    """Extract boolean value from Python dict text"""
    match = re.search(rf"'{key}':\s*(True|False)", text)
    return match.group(1) == 'True' if match else None

def parse_string(text, key):
    """Extract string value from Python dict text"""
    match = re.search(rf"'{key}':\s*'([^']+(?:\\'[^']*)*)'", text)
    return match.group(1).replace("\\'", "'") if match else None

def parse_model_configs(content):
    """Extract MODEL_CONFIGS as dict"""
    dict_str = extract_dict(content, 'MODEL_CONFIGS')
    if not dict_str:
        raise ValueError("MODEL_CONFIGS not found")
    
    models = {}
    pattern = r"'([^']+)':\s*\{([^}]+(?:\{[^}]+\}[^}]*)*)\}"
    
    for match in re.finditer(pattern, dict_str):
        model_id, body = match.groups()
        models[model_id] = {
            k: v for k, v in {
                'name': parse_string(body, 'name'),
                'description': parse_string(body, 'description'),
                'category': parse_string(body, 'category'),
                'requires_prompt': parse_bool(body, 'requires_prompt'),
                'requires_image': parse_bool(body, 'requires_image'),
                'supports_multiple_images': parse_bool(body, 'supports_multiple_images')
            }.items() if v is not None
        }
    
    return models

def parse_aspect_ratios(content):
    """Extract MODEL_ASPECT_RATIOS as dict"""
    dict_str = extract_dict(content, 'MODEL_ASPECT_RATIOS')
    if not dict_str:
        return {}
    
    return {
        match.group(1): re.findall(r"'([^']+)'", match.group(2))
        for match in re.finditer(r"'([^']+)':\s*\[([^\]]+)\]", dict_str)
    }

def parse_aspect_ratio_names(content):
    """Extract ASPECT_RATIO_NAMES as dict"""
    dict_str = extract_dict(content, 'ASPECT_RATIO_NAMES')
    if not dict_str:
        return {}
    
    return {
        match.group(1): match.group(2)
        for match in re.finditer(r"'([^']+)':\s*'([^']+)'", dict_str)
    }

def main():
    bot_py = Path(__file__).parent.parent / 'repo' / 'telegram-bot' / 'bot.py'
    
    if not bot_py.exists():
        sys.exit(f"Error: {bot_py} not found. Run: git submodule update --init")
    
    content = bot_py.read_text(encoding='utf-8')
    
    config = {
        'models': parse_model_configs(content),
        'aspect_ratios': parse_aspect_ratios(content),
        'aspect_ratio_names': parse_aspect_ratio_names(content)
    }
    
    print(json.dumps(config, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
