#!/usr/bin/env python3
"""Session state manager for multi-step workflow"""

import json
from pathlib import Path
from datetime import datetime, timedelta

STATE_DIR = Path(__file__).parent.parent / 'state'
EXPIRY_HOURS = 24

class SessionState:
    def __init__(self, session_id):
        self.file = STATE_DIR / f"{session_id}.json"
        STATE_DIR.mkdir(exist_ok=True)
        self.data = self._load()
    
    def _load(self):
        """Load or create session state"""
        if self.file.exists():
            data = json.loads(self.file.read_text())
            created = datetime.fromisoformat(data.get('created', '2000-01-01'))
            if datetime.now() - created < timedelta(hours=EXPIRY_HOURS):
                return data
        return self._new()
    
    def _new(self):
        """Create fresh state"""
        return {
            'created': datetime.now().isoformat(),
            'step': 'category',
            'category': None,
            'model': None,
            'aspect_ratio': None,
            'prompt': None,
            'image_path': None,
            'history': []
        }
    
    def _save(self):
        self.file.write_text(json.dumps(self.data, indent=2))
    
    def set_category(self, cat):
        self.data.update({'category': cat, 'step': 'model'})
        self._save()
    
    def set_model(self, model_id, needs_ratio=False):
        self.data.update({'model': model_id, 'step': 'aspect_ratio' if needs_ratio else 'prompt'})
        self._save()
    
    def set_aspect_ratio(self, ratio):
        self.data.update({'aspect_ratio': ratio, 'step': 'prompt'})
        self._save()
    
    def set_prompt(self, prompt):
        self.data.update({'prompt': prompt, 'step': 'generating'})
        self._save()
    
    def set_image(self, path):
        self.data['image_path'] = path
        self._save()
    
    def add_history(self, model, prompt, output):
        self.data['history'].append({
            'timestamp': datetime.now().isoformat(),
            'model': model,
            'prompt': prompt,
            'output': output
        })
        self._save()
    
    def reset(self):
        self.data = self._new()
        self._save()
    
    def is_ready(self):
        return self.data['model'] and (self.data['prompt'] or self.data['category'] == 'enhance')

def cleanup_expired():
    """Remove expired session files"""
    if not STATE_DIR.exists():
        return
    cutoff = datetime.now() - timedelta(hours=EXPIRY_HOURS)
    for f in STATE_DIR.glob('*.json'):
        try:
            created = datetime.fromisoformat(json.loads(f.read_text()).get('created', '2000-01-01'))
            if created < cutoff:
                f.unlink()
        except (json.JSONDecodeError, KeyError, ValueError, OSError):
            # Corrupted or inaccessible file, skip
            continue

def main():
    import sys
    if len(sys.argv) < 2:
        sys.exit("Usage: session_state.py <session_id|cleanup> [action] [args...]")
    
    if sys.argv[1] == 'cleanup':
        cleanup_expired()
        print("Cleaned up expired sessions")
        return
    
    state = SessionState(sys.argv[1])
    
    if len(sys.argv) == 2:
        print(json.dumps(state.data, indent=2))
    elif sys.argv[2] == 'reset':
        state.reset()
        print("Reset")
    elif sys.argv[2] == 'set-category':
        state.set_category(sys.argv[3])
        print(f"Category: {sys.argv[3]}")
    elif sys.argv[2] == 'set-model':
        state.set_model(sys.argv[3], len(sys.argv) > 4 and sys.argv[4] in ['true', '1', 'yes'])
        print(f"Model: {sys.argv[3]}")
    elif sys.argv[2] == 'set-ratio':
        state.set_aspect_ratio(sys.argv[3])
        print(f"Ratio: {sys.argv[3]}")
    elif sys.argv[2] == 'set-prompt':
        state.set_prompt(' '.join(sys.argv[3:]))
        print("Prompt set")

if __name__ == '__main__':
    main()
