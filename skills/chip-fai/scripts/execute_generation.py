#!/usr/bin/env python3
"""Execute generation command from workflow and return result"""

import json
import subprocess
import sys
from pathlib import Path

def execute_command(cmd_list):
    """
    Execute generation command and return result
    Returns: {success: bool, output_path: str, error: str}
    """
    try:
        result = subprocess.run(
            cmd_list,
            capture_output=True,
            text=True,
            timeout=180,
            check=True
        )
        
        # Last line of stdout is the output path
        lines = result.stdout.strip().split('\n')
        output_path = lines[-1] if lines else None
        
        if output_path and Path(output_path).exists():
            return {
                'success': True,
                'output_path': output_path,
                'stdout': result.stdout,
                'stderr': result.stderr
            }
        else:
            return {
                'success': False,
                'error': 'No output file generated',
                'stdout': result.stdout,
                'stderr': result.stderr
            }
    
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': 'Generation timeout (>180s)'
        }
    except subprocess.CalledProcessError as e:
        return {
            'success': False,
            'error': f'Command failed: {e.returncode}',
            'stdout': e.stdout,
            'stderr': e.stderr
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def main():
    if len(sys.argv) < 2:
        sys.exit("Usage: execute_generation.py <cmd_json>")
    
    # Parse command from JSON argument or stdin
    if sys.argv[1] == '-':
        cmd_data = json.load(sys.stdin)
    else:
        cmd_data = json.loads(sys.argv[1])
    
    cmd = cmd_data.get('cmd') or cmd_data.get('generate_cmd')
    
    if not cmd:
        print(json.dumps({'success': False, 'error': 'No command provided'}))
        sys.exit(1)
    
    result = execute_command(cmd)
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
