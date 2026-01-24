#!/usr/bin/env python3
"""
Generate inline button configurations for Telegram
Outputs button layout for model selection and aspect ratio selection
"""

import json
import sys
from pathlib import Path

def generate_model_buttons(models_config):
    """
    Generate inline buttons for model selection, grouped by category
    Returns: dict with category -> list of buttons
    """
    categories = {
        'create': {'name': '🎨 Create (Text-to-Image)', 'models': []},
        'edit': {'name': '✏️ Edit (Image-to-Image)', 'models': []},
        'enhance': {'name': '✨ Enhance (Improve Quality)', 'models': []}
    }
    
    # Group models by category
    for model_id, config in models_config.items():
        category = config.get('category', 'create')
        if category in categories:
            categories[category]['models'].append({
                'id': model_id,
                'name': config['name'],
                'description': config.get('description', '')
            })
    
    # Generate button layout
    buttons = {}
    
    for cat_id, cat_data in categories.items():
        cat_buttons = []
        for model in cat_data['models']:
            cat_buttons.append({
                'text': model['name'],
                'callback_data': f'model:{model["id"]}'
            })
        buttons[cat_id] = {
            'title': cat_data['name'],
            'buttons': cat_buttons
        }
    
    return buttons

def generate_aspect_ratio_buttons(aspect_ratios, aspect_ratio_names):
    """
    Generate inline buttons for aspect ratio selection
    Returns: dict with model_id -> list of buttons
    """
    buttons = {}
    
    for model_id, ratios in aspect_ratios.items():
        ratio_buttons = []
        for ratio in ratios:
            display_name = aspect_ratio_names.get(ratio, ratio)
            ratio_buttons.append({
                'text': display_name,
                'callback_data': f'ratio:{ratio}'
            })
        buttons[model_id] = ratio_buttons
    
    return buttons

def main():
    # Parse models configuration
    script_dir = Path(__file__).parent
    parse_models_script = script_dir / 'parse_models.py'
    
    import subprocess
    result = subprocess.run(
        ['python3', str(parse_models_script)],
        capture_output=True,
        text=True,
        check=True
    )
    
    config = json.loads(result.stdout)
    
    models = config['models']
    aspect_ratios = config['aspect_ratios']
    aspect_ratio_names = config['aspect_ratio_names']
    
    # Generate button configurations
    model_buttons = generate_model_buttons(models)
    ratio_buttons = generate_aspect_ratio_buttons(aspect_ratios, aspect_ratio_names)
    
    output = {
        'model_selection': model_buttons,
        'aspect_ratio_selection': ratio_buttons
    }
    
    print(json.dumps(output, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
