#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path

def execute_command(cmd_list):
    try:
        result = subprocess.run(cmd_list, capture_output=True, text=True, timeout=180, check=True)
        output_path = result.stdout.strip().split('\n')[-1]
        
        return {
            'success': Path(output_path).exists(),
            'output_path': output_path,
            'stdout': result.stdout,
            'stderr': result.stderr
        }
    except subprocess.TimeoutExpired:
        return {'success': False, 'error': 'Timeout'}
    except subprocess.CalledProcessError as e:
        return {'success': False, 'error': f'Exit {e.returncode}', 'stdout': e.stdout, 'stderr': e.stderr}

def main():
    if len(sys.argv) < 2:
        sys.exit("Usage: execute_generation.py <cmd_json>")
    
    cmd_data = json.load(sys.stdin) if sys.argv[1] == '-' else json.loads(sys.argv[1])
    cmd = cmd_data.get('cmd') or cmd_data.get('generate_cmd')
    
    if not cmd:
        print(json.dumps({'success': False, 'error': 'No command'}))
        sys.exit(1)
    
    print(json.dumps(execute_command(cmd), indent=2))

if __name__ == '__main__':
    main()
