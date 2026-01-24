#!/usr/bin/env python3
"""
Session state manager for multi-step image generation workflow
Stores user selections: category -> model -> aspect_ratio -> prompt
"""

import json
import os
from pathlib import Path
from datetime import datetime, timedelta

STATE_DIR = Path(__file__).parent.parent / 'state'
STATE_EXPIRY_HOURS = 24

class SessionState:
    def __init__(self, session_id):
        self.session_id = session_id
        self.state_file = STATE_DIR / f"{session_id}.json"
        STATE_DIR.mkdir(exist_ok=True)
        self.state = self._load()
    
    def _load(self):
        """Load state from file or create new"""
        if self.state_file.exists():
            with open(self.state_file, 'r') as f:
                data = json.load(f)
            
            # Check expiry
            created = datetime.fromisoformat(data.get('created', '2000-01-01'))
            if datetime.now() - created > timedelta(hours=STATE_EXPIRY_HOURS):
                # Expired, start fresh
                return self._create_new()
            
            return data
        else:
            return self._create_new()
    
    def _create_new(self):
        """Create new session state"""
        return {
            'created': datetime.now().isoformat(),
            'step': 'category',  # category | model | aspect_ratio | prompt | generating
            'category': None,    # create | edit | enhance
            'model': None,       # model ID
            'aspect_ratio': None, # aspect ratio ID
            'prompt': None,      # user prompt text
            'image_path': None,  # uploaded image path (for edit/enhance)
            'history': []        # list of previous generations
        }
    
    def _save(self):
        """Save state to file"""
        with open(self.state_file, 'w') as f:
            json.dump(self.state, f, indent=2)
    
    def set_category(self, category):
        """Set category and move to model selection"""
        self.state['category'] = category
        self.state['step'] = 'model'
        self._save()
    
    def set_model(self, model_id, requires_aspect_ratio=False):
        """Set model and determine next step"""
        self.state['model'] = model_id
        if requires_aspect_ratio:
            self.state['step'] = 'aspect_ratio'
        else:
            self.state['step'] = 'prompt'
        self._save()
    
    def set_aspect_ratio(self, aspect_ratio):
        """Set aspect ratio and move to prompt"""
        self.state['aspect_ratio'] = aspect_ratio
        self.state['step'] = 'prompt'
        self._save()
    
    def set_prompt(self, prompt):
        """Set prompt and mark ready for generation"""
        self.state['prompt'] = prompt
        self.state['step'] = 'generating'
        self._save()
    
    def set_image(self, image_path):
        """Set uploaded image path"""
        self.state['image_path'] = image_path
        self._save()
    
    def add_to_history(self, model, prompt, output_path):
        """Add successful generation to history"""
        self.state['history'].append({
            'timestamp': datetime.now().isoformat(),
            'model': model,
            'prompt': prompt,
            'output': output_path
        })
        self._save()
    
    def reset(self):
        """Reset to initial state"""
        self.state = self._create_new()
        self._save()
    
    def get_step(self):
        """Get current step"""
        return self.state['step']
    
    def get_all(self):
        """Get entire state"""
        return self.state
    
    def is_ready_to_generate(self):
        """Check if all required fields are set"""
        has_model = self.state['model'] is not None
        has_prompt = self.state['prompt'] is not None
        return has_model and (has_prompt or self.state['category'] == 'enhance')

def cleanup_expired_sessions():
    """Remove expired session files"""
    if not STATE_DIR.exists():
        return
    
    cutoff = datetime.now() - timedelta(hours=STATE_EXPIRY_HOURS)
    
    for state_file in STATE_DIR.glob('*.json'):
        try:
            with open(state_file, 'r') as f:
                data = json.load(f)
            created = datetime.fromisoformat(data.get('created', '2000-01-01'))
            if created < cutoff:
                state_file.unlink()
        except Exception:
            pass

def main():
    """CLI interface for testing"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: session_state.py <session_id> [action] [args...]")
        print("\nActions:")
        print("  get - Show current state")
        print("  reset - Reset session")
        print("  set-category <category>")
        print("  set-model <model_id> [needs_ratio]")
        print("  set-ratio <ratio>")
        print("  set-prompt <prompt>")
        print("  cleanup - Remove expired sessions")
        sys.exit(1)
    
    if sys.argv[1] == 'cleanup':
        cleanup_expired_sessions()
        print("Cleaned up expired sessions")
        return
    
    session_id = sys.argv[1]
    state = SessionState(session_id)
    
    if len(sys.argv) == 2 or sys.argv[2] == 'get':
        print(json.dumps(state.get_all(), indent=2))
    elif sys.argv[2] == 'reset':
        state.reset()
        print("Session reset")
    elif sys.argv[2] == 'set-category':
        state.set_category(sys.argv[3])
        print(f"Category set to: {sys.argv[3]}")
    elif sys.argv[2] == 'set-model':
        needs_ratio = len(sys.argv) > 4 and sys.argv[4].lower() in ['true', '1', 'yes']
        state.set_model(sys.argv[3], needs_ratio)
        print(f"Model set to: {sys.argv[3]}")
    elif sys.argv[2] == 'set-ratio':
        state.set_aspect_ratio(sys.argv[3])
        print(f"Aspect ratio set to: {sys.argv[3]}")
    elif sys.argv[2] == 'set-prompt':
        state.set_prompt(' '.join(sys.argv[3:]))
        print(f"Prompt set")
    else:
        print(f"Unknown action: {sys.argv[2]}")
        sys.exit(1)

if __name__ == '__main__':
    main()
