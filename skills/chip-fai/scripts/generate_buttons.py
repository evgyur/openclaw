#!/usr/bin/env python3
"""Generate Telegram inline button configurations"""

import json
import subprocess
from pathlib import Path

CATEGORIES = {
    'create': '🎨 Create (Text-to-Image)',
    'edit': '✏️ Edit (Image-to-Image)',
    'enhance': '✨ Enhance (Improve Quality)'
}

def load_config():
    """Load parsed models config"""
    result = subprocess.run(
        ['python3', Path(__file__).parent / 'parse_models.py'],
        capture_output=True,
        text=True,
        check=True
    )
    return json.loads(result.stdout)

def generate_model_buttons(models):
    """Group models by category into button layout"""
    grouped = {cat: [] for cat in CATEGORIES}
    
    for model_id, cfg in models.items():
        cat = cfg.get('category', 'create')
        if cat in grouped:
            grouped[cat].append({'text': cfg['name'], 'callback_data': f'model:{model_id}'})
    
    return {
        cat: {'title': CATEGORIES[cat], 'buttons': btns}
        for cat, btns in grouped.items()
    }

def generate_ratio_buttons(aspect_ratios, ratio_names):
    """Map aspect ratios to buttons"""
    return {
        model_id: [
            {'text': ratio_names.get(r, r), 'callback_data': f'ratio:{r}'}
            for r in ratios
        ]
        for model_id, ratios in aspect_ratios.items()
    }

def main():
    cfg = load_config()
    print(json.dumps({
        'model_selection': generate_model_buttons(cfg['models']),
        'aspect_ratio_selection': generate_ratio_buttons(cfg['aspect_ratios'], cfg['aspect_ratio_names'])
    }, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
