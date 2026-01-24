#!/usr/bin/env python3
"""
Parse MODEL_CONFIGS from chip-fai bot.py
Extracts all 18 AI models with their configurations
"""

import re
import json
import sys
from pathlib import Path

def parse_model_configs(bot_py_path):
    """
    Extract MODEL_CONFIGS dictionary from bot.py
    Returns: dict with model configurations
    """
    with open(bot_py_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find MODEL_CONFIGS dictionary
    # Pattern: MODEL_CONFIGS = { ... }
    # Need to handle nested dictionaries properly
    
    match = re.search(r'MODEL_CONFIGS\s*=\s*\{', content)
    if not match:
        raise ValueError("MODEL_CONFIGS not found in bot.py")
    
    start_pos = match.end() - 1  # Position of opening {
    
    # Parse nested braces to find the complete dictionary
    brace_count = 0
    end_pos = start_pos
    
    for i, char in enumerate(content[start_pos:], start=start_pos):
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                end_pos = i + 1
                break
    
    if brace_count != 0:
        raise ValueError("Unbalanced braces in MODEL_CONFIGS")
    
    # Extract the dictionary content
    dict_content = content[start_pos:end_pos]
    
    # Parse manually since it's Python code, not JSON
    # Strategy: extract each model entry
    
    models = {}
    
    # Pattern for model entries: 'model-id': { ... }
    model_pattern = r"'([^']+)':\s*\{([^}]+(?:\{[^}]+\}[^}]*)*)\}"
    
    for match in re.finditer(model_pattern, dict_content):
        model_id = match.group(1)
        model_body = match.group(2)
        
        # Parse model properties
        model_config = {}
        
        # Extract 'name'
        name_match = re.search(r"'name':\s*'([^']+)'", model_body)
        if name_match:
            model_config['name'] = name_match.group(1)
        
        # Extract 'description'
        desc_match = re.search(r"'description':\s*'([^']+(?:\\'[^']*)*)'", model_body)
        if desc_match:
            model_config['description'] = desc_match.group(1).replace("\\'", "'")
        
        # Extract 'category'
        cat_match = re.search(r"'category':\s*'([^']+)'", model_body)
        if cat_match:
            model_config['category'] = cat_match.group(1)
        
        # Extract 'requires_prompt' (boolean)
        prompt_match = re.search(r"'requires_prompt':\s*(True|False)", model_body)
        if prompt_match:
            model_config['requires_prompt'] = prompt_match.group(1) == 'True'
        
        # Extract 'requires_image' (boolean)
        image_match = re.search(r"'requires_image':\s*(True|False)", model_body)
        if image_match:
            model_config['requires_image'] = image_match.group(1) == 'True'
        
        # Extract 'supports_multiple_images' (boolean, optional)
        multi_match = re.search(r"'supports_multiple_images':\s*(True|False)", model_body)
        if multi_match:
            model_config['supports_multiple_images'] = multi_match.group(1) == 'True'
        
        models[model_id] = model_config
    
    return models

def parse_aspect_ratios(bot_py_path):
    """
    Extract MODEL_ASPECT_RATIOS dictionary from bot.py
    Returns: dict mapping model_id -> list of aspect ratios
    """
    with open(bot_py_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    match = re.search(r'MODEL_ASPECT_RATIOS\s*=\s*\{', content)
    if not match:
        return {}
    
    start_pos = match.end() - 1
    brace_count = 0
    end_pos = start_pos
    
    for i, char in enumerate(content[start_pos:], start=start_pos):
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                end_pos = i + 1
                break
    
    dict_content = content[start_pos:end_pos]
    
    aspect_ratios = {}
    
    # Pattern: 'model-id': ['ratio1', 'ratio2', ...]
    pattern = r"'([^']+)':\s*\[([^\]]+)\]"
    
    for match in re.finditer(pattern, dict_content):
        model_id = match.group(1)
        ratios_str = match.group(2)
        
        # Extract individual ratio strings
        ratios = re.findall(r"'([^']+)'", ratios_str)
        aspect_ratios[model_id] = ratios
    
    return aspect_ratios

def parse_aspect_ratio_names(bot_py_path):
    """
    Extract ASPECT_RATIO_NAMES dictionary from bot.py
    Returns: dict mapping ratio_id -> display name
    """
    with open(bot_py_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    match = re.search(r'ASPECT_RATIO_NAMES\s*=\s*\{', content)
    if not match:
        return {}
    
    start_pos = match.end() - 1
    brace_count = 0
    end_pos = start_pos
    
    for i, char in enumerate(content[start_pos:], start=start_pos):
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                end_pos = i + 1
                break
    
    dict_content = content[start_pos:end_pos]
    
    ratio_names = {}
    
    # Pattern: 'ratio_id': 'Display Name'
    pattern = r"'([^']+)':\s*'([^']+)'"
    
    for match in re.finditer(pattern, dict_content):
        ratio_id = match.group(1)
        display_name = match.group(2)
        ratio_names[ratio_id] = display_name
    
    return ratio_names

def main():
    # Path to bot.py in submodule
    bot_py_path = Path(__file__).parent.parent / 'repo' / 'telegram-bot' / 'bot.py'
    
    if not bot_py_path.exists():
        print(f"Error: {bot_py_path} not found", file=sys.stderr)
        print("Make sure the submodule is initialized: git submodule update --init", file=sys.stderr)
        sys.exit(1)
    
    models = parse_model_configs(bot_py_path)
    aspect_ratios = parse_aspect_ratios(bot_py_path)
    aspect_ratio_names = parse_aspect_ratio_names(bot_py_path)
    
    # Build complete configuration
    config = {
        'models': models,
        'aspect_ratios': aspect_ratios,
        'aspect_ratio_names': aspect_ratio_names
    }
    
    # Output as JSON
    print(json.dumps(config, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
