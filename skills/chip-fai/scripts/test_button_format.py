#!/usr/bin/env python3
"""
Validate button format matches Telegram/Clawdbot expectations
According to Telegram Bot API and Clawdbot message tool spec
"""

import json
import subprocess

def validate_button(btn):
    """
    Validate single button structure
    Required: text (str), callback_data (str)
    """
    if not isinstance(btn, dict):
        return False, "Button must be dict"
    if 'text' not in btn:
        return False, "Missing 'text' field"
    if 'callback_data' not in btn:
        return False, "Missing 'callback_data' field"
    if not isinstance(btn['text'], str) or len(btn['text']) == 0:
        return False, "text must be non-empty string"
    if not isinstance(btn['callback_data'], str) or len(btn['callback_data']) == 0:
        return False, "callback_data must be non-empty string"
    if len(btn['callback_data']) > 64:
        return False, f"callback_data too long ({len(btn['callback_data'])} > 64 bytes)"
    return True, "OK"

def validate_button_layout(layout):
    """
    Validate button layout (list of lists)
    """
    if not isinstance(layout, list):
        return False, "Layout must be list"
    
    for row_idx, row in enumerate(layout):
        if not isinstance(row, list):
            return False, f"Row {row_idx} must be list"
        if len(row) == 0:
            return False, f"Row {row_idx} is empty"
        if len(row) > 8:
            return False, f"Row {row_idx} has {len(row)} buttons (max 8)"
        
        for btn_idx, btn in enumerate(row):
            valid, msg = validate_button(btn)
            if not valid:
                return False, f"Row {row_idx}, button {btn_idx}: {msg}"
    
    return True, "OK"

def main():
    # Load generated buttons
    result = subprocess.run(
        ['python3', 'scripts/generate_buttons.py'],
        capture_output=True,
        text=True,
        check=True
    )
    
    data = json.loads(result.stdout)
    
    # Test all button configurations
    errors = []
    
    # Test model selection buttons
    for category, cat_data in data['model_selection'].items():
        buttons = cat_data['buttons']
        
        # Convert to layout (2 per row)
        layout = [buttons[i:i+2] for i in range(0, len(buttons), 2)]
        
        valid, msg = validate_button_layout(layout)
        if not valid:
            errors.append(f"model_selection.{category}: {msg}")
        else:
            print(f"✅ model_selection.{category}: {len(buttons)} buttons OK")
    
    # Test aspect ratio buttons
    for model_id, buttons in data['aspect_ratio_selection'].items():
        layout = [buttons[i:i+2] for i in range(0, len(buttons), 2)]
        
        valid, msg = validate_button_layout(layout)
        if not valid:
            errors.append(f"aspect_ratio_selection.{model_id}: {msg}")
        else:
            print(f"✅ aspect_ratio_selection.{model_id}: {len(buttons)} buttons OK")
    
    if errors:
        print("\n❌ VALIDATION FAILED:")
        for err in errors:
            print(f"  - {err}")
        return 1
    else:
        print("\n✅ ALL BUTTONS VALID")
        return 0

if __name__ == '__main__':
    import sys
    sys.exit(main())
