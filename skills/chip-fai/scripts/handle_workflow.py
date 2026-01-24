#!/usr/bin/env python3
"""
Main workflow handler for chip-fai skill
Manages multi-step image generation process with inline buttons
"""

import json
import sys
import subprocess
from pathlib import Path
from session_state import SessionState, cleanup_expired_sessions

SCRIPT_DIR = Path(__file__).parent
SKILL_DIR = SCRIPT_DIR.parent

def load_models_config():
    """Load parsed models configuration"""
    result = subprocess.run(
        ['python3', str(SCRIPT_DIR / 'parse_models.py')],
        capture_output=True,
        text=True,
        check=True
    )
    return json.loads(result.stdout)

def load_buttons_config():
    """Load generated button configurations"""
    result = subprocess.run(
        ['python3', str(SCRIPT_DIR / 'generate_buttons.py')],
        capture_output=True,
        text=True,
        check=True
    )
    return json.loads(result.stdout)

def format_buttons_for_telegram(buttons_list):
    """
    Format button list for Clawdbot message tool
    Returns: [[{text, callback_data}]]
    """
    rows = []
    row = []
    for btn in buttons_list:
        row.append(btn)
        if len(row) == 2:  # 2 buttons per row
            rows.append(row)
            row = []
    if row:  # Add remaining buttons
        rows.append(row)
    return rows

def handle_start(session_id):
    """
    Handle /gen command - show category selection
    """
    state = SessionState(session_id)
    state.reset()  # Start fresh
    
    # Show category buttons
    message = "🎨 **AI Image Generation**\n\nChoose a category:"
    
    buttons = [
        [
            {"text": "🎨 Create (Text→Image)", "callback_data": "category:create"},
            {"text": "✏️ Edit (Image→Image)", "callback_data": "category:edit"}
        ],
        [
            {"text": "✨ Enhance (Quality)", "callback_data": "category:enhance"}
        ]
    ]
    
    return {
        'message': message,
        'buttons': buttons
    }

def handle_category_selection(session_id, category):
    """
    Handle category selection - show model buttons
    """
    state = SessionState(session_id)
    state.set_category(category)
    
    buttons_config = load_buttons_config()
    models_config = load_models_config()
    
    category_data = buttons_config['model_selection'][category]
    category_title = category_data['title']
    model_buttons = category_data['buttons']
    
    message = f"**{category_title}**\n\nSelect a model:"
    
    # Format buttons for Telegram (2 per row)
    buttons = format_buttons_for_telegram(model_buttons)
    
    # Add back button
    buttons.append([{"text": "⬅️ Back", "callback_data": "back:category"}])
    
    return {
        'message': message,
        'buttons': buttons
    }

def handle_model_selection(session_id, model_id):
    """
    Handle model selection - show aspect ratio or prompt request
    """
    state = SessionState(session_id)
    models_config = load_models_config()
    
    if model_id not in models_config['models']:
        return {
            'message': f"❌ Invalid model: {model_id}",
            'buttons': []
        }
    
    model_config = models_config['models'][model_id]
    model_name = model_config['name']
    category = state.get_all()['category']
    
    # Check if model needs aspect ratio
    if category == 'create' and model_id in models_config['aspect_ratios']:
        state.set_model(model_id, requires_aspect_ratio=True)
        
        buttons_config = load_buttons_config()
        ratio_buttons = buttons_config['aspect_ratio_selection'][model_id]
        
        message = f"**{model_name}**\n\nSelect aspect ratio:"
        
        buttons = format_buttons_for_telegram(ratio_buttons)
        buttons.append([{"text": "⬅️ Back", "callback_data": "back:model"}])
        
        return {
            'message': message,
            'buttons': buttons
        }
    else:
        state.set_model(model_id, requires_aspect_ratio=False)
        
        # Request prompt or image
        if model_config.get('requires_image', True):
            if category == 'enhance':
                message = f"**{model_name}**\n\nPlease upload an image to enhance."
            else:
                message = f"**{model_name}**\n\nPlease upload an image and send your editing prompt."
        else:
            message = f"**{model_name}**\n\nSend your text prompt to generate an image."
        
        return {
            'message': message,
            'buttons': []
        }

def handle_aspect_ratio_selection(session_id, aspect_ratio):
    """
    Handle aspect ratio selection - request prompt
    """
    state = SessionState(session_id)
    state.set_aspect_ratio(aspect_ratio)
    
    models_config = load_models_config()
    model_id = state.get_all()['model']
    model_name = models_config['models'][model_id]['name']
    
    ratio_name = models_config['aspect_ratio_names'].get(aspect_ratio, aspect_ratio)
    
    message = f"**{model_name}**\n**Aspect Ratio**: {ratio_name}\n\nSend your text prompt to generate an image."
    
    return {
        'message': message,
        'buttons': []
    }

def handle_prompt(session_id, prompt):
    """
    Handle prompt text - trigger generation
    """
    state = SessionState(session_id)
    state.set_prompt(prompt)
    
    if not state.is_ready_to_generate():
        return {
            'message': "❌ Missing required information. Please start over with /gen",
            'buttons': []
        }
    
    # Build generation command
    state_data = state.get_all()
    model_id = state_data['model']
    aspect_ratio = state_data.get('aspect_ratio')
    image_path = state_data.get('image_path')
    
    cmd = [
        'bash',
        str(SCRIPT_DIR / 'generate.sh'),
        '--model', model_id,
        '--prompt', prompt
    ]
    
    if aspect_ratio:
        cmd.extend(['--aspect-ratio', aspect_ratio])
    
    if image_path:
        cmd.extend(['--image', image_path])
    
    # Execute generation
    message = f"🚀 Generating with {model_id}...\n\n📝 Prompt: `{prompt}`"
    
    if aspect_ratio:
        models_config = load_models_config()
        ratio_name = models_config['aspect_ratio_names'].get(aspect_ratio, aspect_ratio)
        message += f"\n📐 Aspect Ratio: {ratio_name}"
    
    return {
        'message': message,
        'buttons': [],
        'generate_cmd': cmd,
        'state': state_data
    }

def handle_image_upload(session_id, image_path):
    """
    Handle image upload - store path and check if ready
    """
    state = SessionState(session_id)
    state.set_image(image_path)
    
    state_data = state.get_all()
    category = state_data['category']
    
    if category == 'enhance':
        # Enhance models don't need prompt, can generate immediately
        model_id = state_data.get('model')
        if model_id:
            cmd = [
                'bash',
                str(SCRIPT_DIR / 'generate.sh'),
                '--model', model_id,
                '--image', image_path
            ]
            
            return {
                'message': f"🚀 Enhancing image with {model_id}...",
                'buttons': [],
                'generate_cmd': cmd,
                'state': state_data
            }
    
    # For edit models, still need prompt
    message = "✅ Image received!\n\nNow send your editing prompt."
    
    return {
        'message': message,
        'buttons': []
    }

def handle_back(session_id, back_to):
    """
    Handle back button - navigate to previous step
    """
    if back_to == 'category':
        return handle_start(session_id)
    elif back_to == 'model':
        state = SessionState(session_id)
        category = state.get_all()['category']
        return handle_category_selection(session_id, category)
    else:
        return {
            'message': "❌ Invalid back action",
            'buttons': []
        }

def main():
    """
    CLI interface
    Usage: handle_workflow.py <session_id> <action> [args...]
    """
    if len(sys.argv) < 3:
        print(json.dumps({
            'error': 'Usage: handle_workflow.py <session_id> <action> [args...]'
        }))
        sys.exit(1)
    
    session_id = sys.argv[1]
    action = sys.argv[2]
    
    # Cleanup expired sessions periodically
    cleanup_expired_sessions()
    
    result = None
    
    if action == 'start':
        result = handle_start(session_id)
    elif action == 'category':
        category = sys.argv[3]
        result = handle_category_selection(session_id, category)
    elif action == 'model':
        model_id = sys.argv[3]
        result = handle_model_selection(session_id, model_id)
    elif action == 'ratio':
        aspect_ratio = sys.argv[3]
        result = handle_aspect_ratio_selection(session_id, aspect_ratio)
    elif action == 'prompt':
        prompt = ' '.join(sys.argv[3:])
        result = handle_prompt(session_id, prompt)
    elif action == 'image':
        image_path = sys.argv[3]
        result = handle_image_upload(session_id, image_path)
    elif action == 'back':
        back_to = sys.argv[3]
        result = handle_back(session_id, back_to)
    else:
        result = {'error': f'Unknown action: {action}'}
    
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
