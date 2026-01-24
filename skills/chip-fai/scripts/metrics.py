#!/usr/bin/env python3
"""Simple metrics collection for chip-fai"""

import json
import time
from pathlib import Path
from datetime import datetime

METRICS_FILE = Path(__file__).parent.parent / 'logs' / 'metrics.jsonl'
METRICS_FILE.parent.mkdir(exist_ok=True)

class Metrics:
    def __init__(self):
        self.start_time = time.time()
    
    def record(self, event_type, **data):
        """Record a metric event"""
        entry = {
            'timestamp': datetime.now().isoformat(),
            'event': event_type,
            'duration_ms': int((time.time() - self.start_time) * 1000),
            **data
        }
        
        with open(METRICS_FILE, 'a') as f:
            f.write(json.dumps(entry) + '\n')
    
    def record_generation(self, model, success, error=None):
        """Record a generation attempt"""
        self.record('generation', model=model, success=success, error=error)
    
    def record_error(self, component, error):
        """Record an error"""
        self.record('error', component=component, error=str(error))

def get_stats():
    """Get aggregated statistics"""
    if not METRICS_FILE.exists():
        return {'total': 0, 'success': 0, 'errors': 0}
    
    total = 0
    success = 0
    errors = 0
    
    with open(METRICS_FILE) as f:
        for line in f:
            entry = json.loads(line)
            if entry['event'] == 'generation':
                total += 1
                if entry.get('success'):
                    success += 1
                else:
                    errors += 1
    
    return {
        'total_generations': total,
        'successful': success,
        'failed': errors,
        'success_rate': f"{(success/total*100 if total > 0 else 0):.1f}%"
    }

if __name__ == '__main__':
    print(json.dumps(get_stats(), indent=2))
