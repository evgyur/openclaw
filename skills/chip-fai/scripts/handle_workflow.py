#!/usr/bin/env python3
"""Workflow handler for chip-fai multi-step generation"""

import json
import subprocess
from pathlib import Path
from session_state import SessionState, cleanup_expired

SCRIPTS = Path(__file__).parent

def run_script(name):
    """Run script and return JSON output"""
    result = subprocess.run(
        ['python3', SCRIPTS / f'{name}.py'],
        capture_output=True,
        text=True,
        check=True
    )
    return json.loads(result.stdout)

def format_buttons(btns, per_row=2):
    """Format buttons into rows"""
    return [btns[i:i+per_row] for i in range(0, len(btns), per_row)]

def make_response(msg, btns=None, **extra):
    """Build response dict"""
    return {'message': msg, 'buttons': btns or [], **extra}

def handle_start(session_id):
    """Show category selection"""
    SessionState(session_id).reset()
    return make_response(
        "🎨 **AI Image Generation**\n\nChoose a category:",
        [[
            {"text": "🎨 Create (Text→Image)", "callback_data": "category:create"},
            {"text": "✏️ Edit (Image→Image)", "callback_data": "category:edit"}
        ], [
            {"text": "✨ Enhance (Quality)", "callback_data": "category:enhance"}
        ]]
    )

def handle_category(session_id, category):
    """Show model buttons for category"""
    state = SessionState(session_id)
    state.set_category(category)
    
    btn_cfg = run_script('generate_buttons')
    cat_data = btn_cfg['model_selection'][category]
    
    btns = format_buttons(cat_data['buttons'])
    btns.append([{"text": "⬅️ Back", "callback_data": "back:category"}])
    
    return make_response(f"**{cat_data['title']}**\n\nSelect a model:", btns)

def handle_model(session_id, model_id):
    """Show aspect ratio or prompt request"""
    state = SessionState(session_id)
    models = run_script('parse_models')
    
    if model_id not in models['models']:
        return make_response(f"❌ Invalid model: {model_id}")
    
    model = models['models'][model_id]
    category = state.data['category']
    needs_ratio = category == 'create' and model_id in models['aspect_ratios']
    
    state.set_model(model_id, needs_ratio)
    
    if needs_ratio:
        btn_cfg = run_script('generate_buttons')
        ratio_btns = btn_cfg['aspect_ratio_selection'][model_id]
        btns = format_buttons(ratio_btns)
        btns.append([{"text": "⬅️ Back", "callback_data": "back:model"}])
        return make_response(f"**{model['name']}**\n\nSelect aspect ratio:", btns)
    
    if model.get('requires_image', True):
        msg = f"**{model['name']}**\n\n"
        msg += "Upload an image to enhance." if category == 'enhance' else "Upload image + send editing prompt."
    else:
        msg = f"**{model['name']}**\n\nSend your text prompt."
    
    return make_response(msg)

def handle_ratio(session_id, ratio):
    """Show prompt request after ratio selection"""
    state = SessionState(session_id)
    state.set_aspect_ratio(ratio)
    
    models = run_script('parse_models')
    model = models['models'][state.data['model']]
    ratio_name = models['aspect_ratio_names'].get(ratio, ratio)
    
    return make_response(
        f"**{model['name']}**\n**Aspect Ratio**: {ratio_name}\n\nSend your text prompt."
    )

def handle_prompt(session_id, prompt):
    """Trigger generation"""
    state = SessionState(session_id)
    state.set_prompt(prompt)
    
    if not state.is_ready():
        return make_response("❌ Missing info. Restart with /gen")
    
    data = state.data
    cmd = ['bash', str(SCRIPTS / 'generate.sh'), '--model', data['model'], '--prompt', prompt]
    
    if data.get('aspect_ratio'):
        cmd.extend(['--aspect-ratio', data['aspect_ratio']])
    if data.get('image_path'):
        cmd.extend(['--image', data['image_path']])
    
    msg = f"🚀 Generating...\n\n📝 {prompt}"
    if data.get('aspect_ratio'):
        models = run_script('parse_models')
        ratio_name = models['aspect_ratio_names'].get(data['aspect_ratio'], data['aspect_ratio'])
        msg += f"\n📐 {ratio_name}"
    
    return make_response(msg, generate_cmd=cmd, state=data)

def handle_image(session_id, image_path):
    """Store uploaded image"""
    state = SessionState(session_id)
    state.set_image(image_path)
    
    data = state.data
    
    if data['category'] == 'enhance' and data.get('model'):
        cmd = ['bash', str(SCRIPTS / 'generate.sh'), '--model', data['model'], '--image', image_path]
        return make_response(f"🚀 Enhancing...", generate_cmd=cmd, state=data)
    
    return make_response("✅ Image received!\n\nNow send your editing prompt.")

def handle_back(session_id, back_to):
    """Navigate back"""
    if back_to == 'category':
        return handle_start(session_id)
    elif back_to == 'model':
        state = SessionState(session_id)
        return handle_category(session_id, state.data['category'])
    return make_response("❌ Invalid back action")

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
