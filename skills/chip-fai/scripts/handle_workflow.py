#!/usr/bin/env python3
"""Workflow handler for chip-fai multi-step generation"""

import json
import subprocess
from pathlib import Path
from session_state import SessionState, cleanup_expired

SCRIPTS = Path(__file__).parent

def format_buttons(btns, per_row=2):
    return [btns[i:i+per_row] for i in range(0, len(btns), per_row)]

def handle_start(session_id):
    SessionState(session_id).reset()
    return {
        'message': "🎨 **AI Image Generation**\n\nChoose a category:",
        'buttons': [[
            {"text": "🎨 Create (Text→Image)", "callback_data": "category:create"},
            {"text": "✏️ Edit (Image→Image)", "callback_data": "category:edit"}
        ], [
            {"text": "✨ Enhance (Quality)", "callback_data": "category:enhance"}
        ]]
    }

def handle_category(session_id, category):
    state = SessionState(session_id)
    state.set_category(category)
    
    result = subprocess.run(['python3', SCRIPTS / 'generate_buttons.py'], capture_output=True, text=True, check=True)
    cat_data = json.loads(result.stdout)['model_selection'][category]
    
    btns = format_buttons(cat_data['buttons'])
    btns.append([{"text": "⬅️ Back", "callback_data": "back:category"}])
    
    return {'message': f"**{cat_data['title']}**\n\nSelect a model:", 'buttons': btns}

def handle_model(session_id, model_id):
    state = SessionState(session_id)
    result = subprocess.run(['python3', SCRIPTS / 'parse_models.py'], capture_output=True, text=True, check=True)
    models = json.loads(result.stdout)
    
    if model_id not in models['models']:
        return {'message': f"❌ Invalid model: {model_id}", 'buttons': []}
    
    model = models['models'][model_id]
    category = state.data['category']
    needs_ratio = category == 'create' and model_id in models['aspect_ratios']
    
    state.set_model(model_id, needs_ratio)
    
    if needs_ratio:
        result = subprocess.run(['python3', SCRIPTS / 'generate_buttons.py'], capture_output=True, text=True, check=True)
        ratio_btns = json.loads(result.stdout)['aspect_ratio_selection'][model_id]
        btns = format_buttons(ratio_btns)
        btns.append([{"text": "⬅️ Back", "callback_data": "back:model"}])
        return {'message': f"**{model['name']}**\n\nSelect aspect ratio:", 'buttons': btns}
    
    if 'requires_image' in model and not model['requires_image']:
        msg = f"**{model['name']}**\n\nSend your text prompt."
    else:
        msg = f"**{model['name']}**\n\n" + ("Upload an image to enhance." if category == 'enhance' else "Upload image + send editing prompt.")
    
    return {'message': msg, 'buttons': []}

def handle_ratio(session_id, ratio):
    state = SessionState(session_id)
    state.set_aspect_ratio(ratio)
    
    result = subprocess.run(['python3', SCRIPTS / 'parse_models.py'], capture_output=True, text=True, check=True)
    models = json.loads(result.stdout)
    model = models['models'][state.data['model']]
    ratio_name = models['aspect_ratio_names'].get(ratio, ratio)
    
    return {
        'message': f"**{model['name']}**\n**Aspect Ratio**: {ratio_name}\n\nSend your text prompt.",
        'buttons': []
    }

def handle_prompt(session_id, prompt):
    state = SessionState(session_id)
    state.set_prompt(prompt)
    
    if not state.is_ready():
        return {'message': "❌ Missing info. Restart with /gen", 'buttons': []}
    
    data = state.data
    cmd = ['bash', str(SCRIPTS / 'generate.sh'), '--model', data['model'], '--prompt', prompt]
    
    if data.get('aspect_ratio'):
        cmd.extend(['--aspect-ratio', data['aspect_ratio']])
    if data.get('image_path'):
        cmd.extend(['--image', data['image_path']])
    
    msg = f"🚀 Generating...\n\n📝 {prompt}"
    if data.get('aspect_ratio'):
        result = subprocess.run(['python3', SCRIPTS / 'parse_models.py'], capture_output=True, text=True, check=True)
        ratio_name = json.loads(result.stdout)['aspect_ratio_names'].get(data['aspect_ratio'], data['aspect_ratio'])
        msg += f"\n📐 {ratio_name}"
    
    return {'message': msg, 'buttons': [], 'generate_cmd': cmd, 'state': data}

def handle_image(session_id, image_path):
    state = SessionState(session_id)
    state.set_image(image_path)
    data = state.data
    
    if data['category'] == 'enhance' and data.get('model'):
        cmd = ['bash', str(SCRIPTS / 'generate.sh'), '--model', data['model'], '--image', image_path]
        return {'message': "🚀 Enhancing...", 'buttons': [], 'generate_cmd': cmd, 'state': data}
    
    return {'message': "✅ Image received!\n\nNow send your editing prompt.", 'buttons': []}

def handle_back(session_id, back_to):
    if back_to == 'category':
        return handle_start(session_id)
    if back_to == 'model':
        return handle_category(session_id, SessionState(session_id).data['category'])
    return {'message': "❌ Invalid back action", 'buttons': []}

HANDLERS = {
    'start': lambda sid, *a: handle_start(sid),
    'category': handle_category,
    'model': handle_model,
    'ratio': handle_ratio,
    'prompt': handle_prompt,
    'image': handle_image,
    'back': handle_back
}

def main():
    import sys
    if len(sys.argv) < 3:
        sys.exit("Usage: handle_workflow.py <session_id> <action> [args...]")
    
    cleanup_expired()
    
    session_id, action = sys.argv[1:3]
    args = sys.argv[3:]
    
    handler = HANDLERS.get(action)
    if not handler:
        print(json.dumps({'error': f'Unknown action: {action}'}))
    else:
        result = handler(session_id, *args)
        print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
