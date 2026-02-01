#!/usr/bin/env python3
"""
Task Decomposer — Breaks tasks into subagent phases
"""

import re
import json
import sys
from pathlib import Path
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass

@dataclass
class Phase:
    name: str
    mission: str
    dependencies: List[str]
    timeout: int
    model: str

class TaskDecomposer:
    """Decomposes user tasks into subagent phases"""
    
    # Default phases for parallel execution
    DEFAULT_PHASES = [
        Phase(
            name="research",
            mission="Gather relevant context from codebase, find similar implementations, check documentation",
            dependencies=[],
            timeout=300,
            model="claude-sonnet-4"
        ),
        Phase(
            name="audit",
            mission="Review current state, find existing related code, identify impact areas",
            dependencies=[],
            timeout=300,
            model="claude-sonnet-4"
        ),
        Phase(
            name="draft",
            mission="Generate 2-3 implementation options with tradeoffs, code snippets, complexity estimates",
            dependencies=["research", "audit"],
            timeout=600,
            model="claude-sonnet-4"
        ),
        Phase(
            name="verify",
            mission="Check for conflicts, validate against constraints, ensure test coverage plan",
            dependencies=["draft"],
            timeout=300,
            model="claude-sonnet-4"
        ),
    ]
    
    # Task pattern to label prefix mapping
    LABEL_PATTERNS = [
        (r"implement\s+(.*)", "impl"),
        (r"refactor\s+(.*)", "refactor"),
        (r"fix\s+(.*)", "fix"),
        (r"add\s+(.*)", "add"),
        (r"create\s+(.*)", "create"),
        (r"migrate\s+(.*)", "migrate"),
        (r"update\s+(.*)", "update"),
        (r"optimize\s+(.*)", "optimize"),
    ]
    
    def __init__(self, config_path: Path = None):
        self.config = self._load_config(config_path)
    
    def _load_config(self, config_path: Path) -> Dict[str, Any]:
        """Load configuration or use defaults"""
        default = {
            "phases": {
                "research": {"enabled": True, "timeout": 300, "model": "claude-sonnet-4"},
                "audit": {"enabled": True, "timeout": 300, "model": "claude-sonnet-4"},
                "draft": {"enabled": True, "timeout": 600, "model": "claude-sonnet-4", "options_count": 3},
                "verify": {"enabled": True, "timeout": 300, "model": "claude-sonnet-4"},
            },
            "synthesis": {
                "conflict_resolution": "auto",
                "format": "markdown",
                "include_reasoning": True
            },
            "parallel_limit": 4,
            "retry_failed": True,
            "auto_synthesize": True
        }
        
        if config_path and config_path.exists():
            with open(config_path) as f:
                user_config = json.load(f)
                # Merge nested configs
                for key in default:
                    if key in user_config:
                        if isinstance(default[key], dict):
                            default[key].update(user_config[key])
                        else:
                            default[key] = user_config[key]
        
        return default
    
    def decompose(self, task: str) -> Tuple[str, List[Phase]]:
        """
        Decompose a task into phases with labels
        Returns: (label_prefix, list of phases)
        """
        # Generate label prefix from task
        prefix = self._generate_label(task)
        
        # Get enabled phases
        phases = []
        for phase in self.DEFAULT_PHASES:
            phase_config = self.config.get("phases", {}).get(phase.name, {})
            if phase_config.get("enabled", True):
                phases.append(Phase(
                    name=phase.name,
                    mission=phase.mission,
                    dependencies=phase.dependencies,
                    timeout=phase_config.get("timeout", phase.timeout),
                    model=phase_config.get("model", phase.model)
                ))
        
        return prefix, phases
    
    def _generate_label(self, task: str) -> str:
        """Generate label prefix from task description"""
        task_lower = task.lower()
        
        # Try to match patterns
        for pattern, prefix in self.LABEL_PATTERNS:
            match = re.search(pattern, task_lower)
            if match:
                # Extract subject, sanitize for label
                subject = match.group(1).strip()
                # Take first 2-3 words, lowercase, hyphens
                words = subject.split()[:3]
                subject_slug = "-".join(w.lower()[:10] for w in words)
                subject_slug = re.sub(r'[^\w-]', '', subject_slug)
                return f"{prefix}-{subject_slug}"
        
        # Fallback: generate from task hash or first few words
        words = task_lower.split()[:2]
        return f"task-{'-'.join(words)}"
    
    def get_execution_plan(self, prefix: str, phases: List[Phase]) -> Dict[str, Any]:
        """Generate execution plan with dependency ordering"""
        # Build dependency graph
        plan = {
            "label_prefix": prefix,
            "phases": [],
            "parallel_groups": []
        }
        
        # Phase 1: No dependencies (can run in parallel)
        phase1 = [p for p in phases if not p.dependencies]
        # Phase 2: Depend on phase 1
        phase2 = [p for p in phases if any(d in [p1.name for p1 in phase1] for d in p.dependencies)]
        # Phase 3: Depend on phase 2
        phase3 = [p for p in phases if any(d in [p2.name for p2 in phase2] for d in p.dependencies)]
        
        all_phases = []
        for p in phases:
            all_phases.append({
                "name": p.name,
                "label": f"{prefix}-{p.name}",
                "mission": p.mission,
                "dependencies": p.dependencies,
                "timeout": p.timeout,
                "model": p.model
            })
        
        plan["phases"] = all_phases
        plan["parallel_groups"] = [
            {"stage": 1, "phases": [p.name for p in phase1], "parallel": True},
            {"stage": 2, "phases": [p.name for p in phase2], "parallel": len(phase2) > 1},
            {"stage": 3, "phases": [p.name for p in phase3], "parallel": len(phase3) > 1},
        ]
        
        return plan
    
    def format_plan(self, task: str, plan: Dict[str, Any]) -> str:
        """Format execution plan for display"""
        lines = [
            f"🔀 Task Decomposition: {task}",
            "",
            f"Label Prefix: `{plan['label_prefix']}`",
            "",
            "Execution Plan:",
        ]
        
        for group in plan["parallel_groups"]:
            if group["phases"]:
                parallel_status = "🔄 parallel" if group["parallel"] else "➡️ sequential"
                lines.append(f"\nStage {group['stage']}: {parallel_status}")
                for phase_name in group["phases"]:
                    phase = next(p for p in plan["phases"] if p["name"] == phase_name)
                    lines.append(f"  • [{phase['label']}] {phase_name}")
                    lines.append(f"    └─ {phase['mission'][:60]}...")
        
        lines.append("")
        lines.append(f"Total phases: {len(plan['phases'])}")
        
        return "\n".join(lines)

def main():
    """CLI entry point"""
    if len(sys.argv) < 2:
        print("Usage: decomposer.py '<task>' [--plan]")
        sys.exit(1)
    
    task = sys.argv[1]
    show_plan = "--plan" in sys.argv
    
    config_path = Path(__file__).parent.parent / ".subagents-config.json"
    decomposer = TaskDecomposer(config_path if config_path.exists() else None)
    
    prefix, phases = decomposer.decompose(task)
    plan = decomposer.get_execution_plan(prefix, phases)
    
    if show_plan:
        print(decomposer.format_plan(task, plan))
    else:
        # Output JSON for programmatic use
        print(json.dumps(plan, indent=2))

if __name__ == "__main__":
    main()
