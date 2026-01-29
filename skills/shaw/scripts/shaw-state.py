#!/usr/bin/env python3
"""
Shaw Workflow State Manager
Tracks current position in the workflow with hybrid storage and ASCII visualization.
"""

import json
import sys
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

# Workflow definitions
WORKFLOWS = {
    "easy": [1, 2, 3, 6, 0],
    "standard": [1, 2, 3, 4, 5, 6, 7, 8, 9, 0],
    "hard": [1, 2, 3, 6, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
}

PROMPT_NAMES = {
    1: "Plan & Research",
    2: "Implement",
    3: "Keep Going",
    4: "Code Quality",
    5: "Testing",
    6: "LARP Assessment",
    7: "Clean Up",
    8: "Prod Ready",
    9: "Review",
    0: "Fix Issues"
}

PROMPT_ICONS = {
    1: "📋",
    2: "⚡",
    3: "🏃",
    4: "✨",
    5: "🧪",
    6: "⭐",
    7: "🧹",
    8: "🚀",
    9: "👀",
    0: "🔧"
}

def is_git_repo() -> bool:
    """Check if current directory is a git repository."""
    try:
        subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            capture_output=True,
            check=True,
            timeout=5
        )
        return True
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
        return False

def get_state_path() -> Path:
    """Get state file path. Uses project file in git repo, global fallback otherwise."""
    if is_git_repo():
        return Path.cwd() / ".shaw_state.json"
    # Fallback to global state file in user's home
    fallback_dir = Path.home() / ".cache" / "shaw"
    fallback_dir.mkdir(parents=True, exist_ok=True)
    return fallback_dir / "state.json"

def load_state() -> Dict[str, Any]:
    """Load workflow state from file or return empty."""
    state_path = get_state_path()
    if state_path.exists():
        with open(state_path) as f:
            return json.load(f)
    return {}

def save_state(state: Dict[str, Any]):
    """Save workflow state to file."""
    state_path = get_state_path()
    with open(state_path, 'w') as f:
        json.dump(state, f, indent=2)

def start_workflow(workflow_type: str, task: str) -> Dict[str, Any]:
    """Initialize new workflow."""
    state = {
        "workflow": workflow_type,
        "task": task,
        "current_index": 0,
        "started": datetime.now().isoformat(),
        "completed": [],
        "notes": [],
        "storage": "project" if is_git_repo() else "global"
    }
    save_state(state)
    return state

def get_current_prompt(state: Dict[str, Any]) -> Optional[int]:
    """Get current prompt number."""
    workflow = WORKFLOWS.get(state.get("workflow", "standard"), [])
    idx = state.get("current_index", 0)
    if idx < len(workflow):
        return workflow[idx]
    return None

def next_step(state: Dict[str, Any]) -> Optional[int]:
    """Advance to next step."""
    workflow = WORKFLOWS.get(state.get("workflow", "standard"), [])
    current = get_current_prompt(state)
    if current is not None:
        state["completed"] = state.get("completed", []) + [current]
    state["current_index"] = state.get("current_index", 0) + 1
    save_state(state)
    return get_current_prompt(state)

def render_progress_bar(current: int, total: int, width: int = 10) -> str:
    """Render ASCII progress bar."""
    filled = int(width * current / total) if total > 0 else 0
    return "█" * filled + "░" * (width - filled)

def visualize_workflow(state: Dict[str, Any]) -> str:
    """Create ASCII visualization of workflow progress."""
    workflow_type = state.get("workflow", "standard")
    workflow = WORKFLOWS.get(workflow_type, [])
    idx = state.get("current_index", 0)
    task = state.get("task", "Unknown task")
    started = state.get("started", "Unknown")
    storage = state.get("storage", "project")
    
    lines = [
        f"🥷 Shaw Workflow — {task[:40]}{'...' if len(task) > 40 else ''}",
        "",
    ]
    
    # Progress bar for each stage
    stage_lines = []
    status_lines = []
    
    for i, p in enumerate(workflow):
        name = PROMPT_NAMES.get(p, f"P{p}")
        icon = PROMPT_ICONS.get(p, "•")
        bar = render_progress_bar(1 if i < idx else (0 if i > idx else 0), 1, 1)
        
        if i < idx:
            stage_lines.append(f"{icon} {name:<12}")
            status_lines.append("   ✅ Done    ")
        elif i == idx:
            stage_lines.append(f"{icon} {name:<12}")
            status_lines.append("   ⏳ Current ")
        else:
            stage_lines.append(f"{icon} {name:<12}")
            status_lines.append("   ⏹ Pending ")
    
    # Display in rows of 5
    for row_start in range(0, len(stage_lines), 5):
        row_end = min(row_start + 5, len(stage_lines))
        lines.append("  ".join(stage_lines[row_start:row_end]))
        lines.append("  ".join(status_lines[row_start:row_end]))
        lines.append("")
    
    # Summary
    total = len(workflow)
    completed = idx
    percent = int(100 * completed / total) if total > 0 else 0
    
    emoji = "🟢" if workflow_type == "easy" else ("🔴" if workflow_type == "hard" else "🟡")
    
    lines.append(f"Path: {emoji} {workflow_type.upper()} ({'→'.join(map(str, workflow))})")
    lines.append(f"Progress: {render_progress_bar(completed, total, 20)} {percent}%")
    lines.append(f"Storage: {storage}")
    lines.append(f"Started: {started[:19] if len(started) > 19 else started}")
    
    return "\n".join(lines)

def get_compact_status(state: Dict[str, Any]) -> str:
    """Get one-line status."""
    workflow_type = state.get("workflow", "standard")
    workflow = WORKFLOWS.get(workflow_type, [])
    idx = state.get("current_index", 0)
    current = get_current_prompt(state)
    
    if current is None:
        return f"✅ Workflow complete!"
    
    name = PROMPT_NAMES.get(current, f"Prompt {current}")
    icon = PROMPT_ICONS.get(current, "•")
    total = len(workflow)
    percent = int(100 * idx / total) if total > 0 else 0
    
    return f"{icon} {name} ({idx}/{total}, {percent}%)"

def main():
    if len(sys.argv) < 2:
        print("Usage: shaw-state <command> [args]")
        print("")
        print("Commands:")
        print("  start <easy|standard|hard> <task>  Start new workflow")
        print("  next                               Advance to next step")
        print("  current                            Show current prompt")
        print("  status                             Show compact status")
        print("  visualize                          Show ASCII visualization")
        print("  reset                              Clear state")
        print("  path                               Show state file path")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "start":
        if len(sys.argv) < 4:
            print("Usage: shaw-state start <easy|standard|hard> <task>")
            sys.exit(1)
        workflow = sys.argv[2]
        task = " ".join(sys.argv[3:])
        state = start_workflow(workflow, task)
        current = get_current_prompt(state)
        storage = state.get("storage", "project")
        print(f"Started {workflow.upper()} workflow: {task}")
        print(f"Storage: {storage}")
        print(f"Current: {PROMPT_ICONS.get(current, '•')} {PROMPT_NAMES.get(current)}")
        
    elif cmd == "next":
        state = load_state()
        if not state:
            print("No active workflow. Start with: shaw-state start <type> <task>")
            sys.exit(1)
        current = get_current_prompt(state)
        next_p = next_step(state)
        if next_p:
            print(f"Completed: {PROMPT_ICONS.get(current, '•')} {PROMPT_NAMES.get(current)}")
            print(f"Next: {PROMPT_ICONS.get(next_p, '•')} {PROMPT_NAMES.get(next_p)}")
        else:
            print(f"Completed: {PROMPT_ICONS.get(current, '•')} {PROMPT_NAMES.get(current)}")
            print("🎉 Workflow complete!")
            
    elif cmd == "current":
        state = load_state()
        if not state:
            print("No active workflow.")
            sys.exit(1)
        current = get_current_prompt(state)
        print(f"{PROMPT_ICONS.get(current, '•')} {PROMPT_NAMES.get(current)}")
        
    elif cmd == "status":
        state = load_state()
        if not state:
            print("No active workflow.")
            sys.exit(1)
        print(get_compact_status(state))
        
    elif cmd == "visualize":
        state = load_state()
        if not state:
            print("No active workflow.")
            sys.exit(1)
        print(visualize_workflow(state))
        
    elif cmd == "path":
        path = get_state_path()
        storage = "project" if is_git_repo() else "global"
        print(f"{path} ({storage})")
            
    elif cmd == "reset":
        state_path = get_state_path()
        if state_path.exists():
            state_path.unlink()
            print("Workflow state reset.")
        else:
            print("No state to reset.")
            
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)

if __name__ == "__main__":
    main()
