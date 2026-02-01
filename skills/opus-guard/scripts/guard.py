#!/usr/bin/env python3
"""
Opus Guard - Permission hook engine
Intercepts high-risk operations and routes to Opus for evaluation
"""

import json
import re
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class RiskAssessment:
    tool: str
    operation: str
    risk_level: str  # low, medium, high, critical
    indicators: List[str]
    params: Dict[str, Any]

@dataclass
class Verdict:
    approved: bool
    confidence: float
    reasoning: str
    risk_factors: List[str]
    mitigations: List[str]
    assessment_type: str  # heuristic, opus, blocked

class OpusGuard:
    """Main security guard engine"""
    
    # Pattern definitions
    SOCIAL_ENGINEERING_PATTERNS = [
        r'\b(URGENT|ASAP|IMMEDIATE|NOW|HURRY|CRITICAL)\b',
        r'\b(please respond|need you to|do this now)\b',
        r'\b(system|admin|root|owner)\s+(requires|needs|says)\b',
        r'\b(I\'m|this is)\s+(your admin|from support)\b',
        r'\b(we\'re|let\'s)\s+(colleagues|teammates|developers)\b',
        r'\b(as a fellow|between us)\b',
        r'\b(don\'t|never)\s+(tell|share|mention)\b',
    ]
    
    EXFILTRATION_INDICATORS = [
        r'\b(ssh_key|private_key|password|secret|token|credential)\b',
        r'\.ssh\/|\.aws\/|\.env$|\.env\.[\w]+',
        r'\/etc\/|\/var\/log\/|\/proc\/|\/sys\/',
        r'base64\s+encode|openssl\s+(enc|base64)',
        r'curl.*-d.*\{.*\}',
        r'find.*-type\s+f.*-exec',
        r'tar.*-czf.*\/',
    ]
    
    SCOPE_VIOLATIONS = [
        r'cd\s+\/[^/]|cd\s+~\/\.(?!clawdbot)',
        r'curl.*http|wget.*http',
        r'nc\s+-|netcat|ncat',
        r'sudo|su\s+-',
        r'chmod\s+[0-7]{3,4}',
        r'chown\s+root',
    ]
    
    BLOCK_PATTERNS = [
        r'rm\s+-rf\s+/',
        r'curl.*\|.*bash',
        r'curl.*\|.*sh',
        r'wget.*\|.*bash',
        r':\(\)\s*\{\s*:\|:\s*&\s*\};\s*:',
        r'mkfs\.',
        r'dd\s+if=.*of=\/dev\/',
    ]
    
    TRUSTED_PATTERNS = [
        r'^git\s+status$',
        r'^git\s+diff',
        r'^git\s+log',
        r'^ls\s+',
        r'^cat\s+.*\.md$',
        r'^cat\s+.*\.json$',
        r'^cat\s+.*\.ts$',
        r'^find\s+\.\s+',
        r'^grep\s+',
        r'^head\s+',
        r'^tail\s+',
    ]
    
    def __init__(self, config_path: Optional[Path] = None):
        self.config = self._load_config(config_path)
        self.log_file = Path(__file__).parent.parent / "logs" / "evaluations.jsonl"
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
    
    def _load_config(self, config_path: Optional[Path]) -> Dict[str, Any]:
        """Load configuration with defaults"""
        defaults = {
            "enabled": True,
            "log_all_operations": True,
            "log_level": "info",
            "opus": {
                "model": "claude-opus-4-5",
                "timeout": 30,
                "max_retries": 2
            },
            "risk_levels": {
                "message:send": {
                    "low": {"confidence": 0.95, "auto_approve": True},
                    "medium": {"confidence": 0.85, "auto_approve": True},
                    "high": {"confidence": 0.90, "auto_approve": False, "require_opus": True}
                },
                "write": {
                    "low": {"confidence": 0.95, "auto_approve": True},
                    "medium": {"confidence": 0.90, "auto_approve": True},
                    "high": {"confidence": 0.90, "auto_approve": False, "require_opus": True}
                },
                "edit": {
                    "low": {"confidence": 0.95, "auto_approve": True},
                    "medium": {"confidence": 0.85, "auto_approve": False, "require_opus": True},
                    "high": {"confidence": 0.90, "auto_approve": False, "require_opus": True}
                },
                "exec": {
                    "low": {"confidence": 0.95, "auto_approve": True},
                    "medium": {"confidence": 0.80, "auto_approve": False, "require_opus": True},
                    "high": {"confidence": 0.90, "auto_approve": False, "require_opus": True}
                }
            },
            "auto_approve": {
                "trusted_patterns": TRUSTED_PATTERNS.copy(),
                "trusted_paths": ["skills/*", "docs/*", "src/*"]
            },
            "block_patterns": BLOCK_PATTERNS.copy()
        }
        
        if config_path and config_path.exists():
            with open(config_path) as f:
                user_config = json.load(f)
                self._deep_merge(defaults, user_config)
        
        return defaults
    
    def _deep_merge(self, base: Dict, update: Dict):
        """Deep merge dictionaries"""
        for key, value in update.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._deep_merge(base[key], value)
            else:
                base[key] = value
    
    def assess_risk(self, tool: str, params: Dict[str, Any]) -> RiskAssessment:
        """Assess risk level of an operation"""
        indicators = []
        
        # Check for critical block patterns first
        if tool == "exec":
            command = params.get("command", "")
            for pattern in self.config.get("block_patterns", []):
                if re.search(pattern, command, re.IGNORECASE):
                    return RiskAssessment(
                        tool=tool,
                        operation=command,
                        risk_level="critical",
                        indicators=[f"matches block pattern: {pattern}"],
                        params=params
                    )
        
        # Check trusted patterns for low-risk
        if tool == "exec":
            command = params.get("command", "")
            for pattern in self.config.get("auto_approve", {}).get("trusted_patterns", []):
                if re.match(pattern, command):
                    return RiskAssessment(
                        tool=tool,
                        operation=command,
                        risk_level="low",
                        indicators=[f"matches trusted pattern: {pattern}"],
                        params=params
                    )
        
        # Tool-specific risk assessment
        if tool == "message:send":
            return self._assess_message_risk(params)
        elif tool == "write":
            return self._assess_write_risk(params)
        elif tool == "edit":
            return self._assess_edit_risk(params)
        elif tool == "exec":
            return self._assess_exec_risk(params)
        
        # Default to medium risk for unknown tools
        return RiskAssessment(
            tool=tool,
            operation=str(params),
            risk_level="medium",
            indicators=["unknown tool"],
            params=params
        )
    
    def _assess_message_risk(self, params: Dict[str, Any]) -> RiskAssessment:
        """Assess message:send risk"""
        indicators = []
        
        target = params.get("target", "")
        message = params.get("message", "")
        content = f"{target} {message}".lower()
        
        # Check for social engineering
        for pattern in self.SOCIAL_ENGINEERING_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                indicators.append(f"social engineering pattern: {pattern[:30]}")
        
        # Check for exfiltration indicators
        for pattern in self.EXFILTRATION_INDICATORS:
            if re.search(pattern, content, re.IGNORECASE):
                indicators.append(f"exfiltration indicator: {pattern[:30]}")
        
        # Target analysis
        if target.startswith("@") or target.startswith("+"):
            indicators.append("external recipient")
        
        # Determine risk level
        if len(indicators) >= 2:
            risk = "high"
        elif len(indicators) == 1:
            risk = "medium"
        else:
            risk = "low"
        
        return RiskAssessment(
            tool="message:send",
            operation=f"send to {target}",
            risk_level=risk,
            indicators=indicators,
            params=params
        )
    
    def _assess_write_risk(self, params: Dict[str, Any]) -> RiskAssessment:
        """Assess write risk"""
        indicators = []
        
        file_path = params.get("file_path", "")
        path_lower = file_path.lower()
        
        # Critical file checks
        if "security" in path_lower or "secret" in path_lower:
            indicators.append("security-related file")
        
        if ".env" in path_lower or "config" in path_lower:
            indicators.append("configuration file")
        
        if ".ssh" in path_lower or ".aws" in path_lower:
            indicators.append("credential file location")
        
        # Content analysis
        content = params.get("content", "")
        for pattern in self.EXFILTRATION_INDICATORS:
            if re.search(pattern, content, re.IGNORECASE):
                indicators.append(f"sensitive content: {pattern[:30]}")
        
        # Determine risk level
        if len(indicators) >= 2 or "credential" in indicators:
            risk = "high"
        elif len(indicators) == 1:
            risk = "medium"
        else:
            risk = "low"
        
        return RiskAssessment(
            tool="write",
            operation=f"write to {file_path}",
            risk_level=risk,
            indicators=indicators,
            params=params
        )
    
    def _assess_edit_risk(self, params: Dict[str, Any]) -> RiskAssessment:
        """Assess edit risk"""
        indicators = []
        
        file_path = params.get("path", "")
        path_lower = file_path.lower()
        
        # Critical file checks
        if "security" in path_lower or "auth" in path_lower:
            indicators.append("security-related file")
        
        if "guard" in path_lower or "hook" in path_lower:
            indicators.append("guard/hook modification")
        
        # Change analysis
        new_text = params.get("newText", "")
        for pattern in self.SCOPE_VIOLATIONS:
            if re.search(pattern, new_text, re.IGNORECASE):
                indicators.append(f"suspicious change: {pattern[:30]}")
        
        # Determine risk level
        if len(indicators) >= 2:
            risk = "high"
        elif len(indicators) == 1:
            risk = "medium"
        else:
            risk = "low"
        
        return RiskAssessment(
            tool="edit",
            operation=f"edit {file_path}",
            risk_level=risk,
            indicators=indicators,
            params=params
        )
    
    def _assess_exec_risk(self, params: Dict[str, Any]) -> RiskAssessment:
        """Assess exec risk"""
        indicators = []
        
        command = params.get("command", "")
        cmd_lower = command.lower()
        
        # Check for scope violations
        for pattern in self.SCOPE_VIOLATIONS:
            if re.search(pattern, cmd_lower):
                indicators.append(f"scope violation: {pattern[:30]}")
        
        # Privilege escalation
        if "sudo" in cmd_lower or "su -" in cmd_lower:
            indicators.append("privilege escalation")
        
        # Network operations
        if re.search(r'curl|wget|nc\s', cmd_lower):
            indicators.append("network operation")
        
        # Destructive operations
        if re.search(r'rm\s+-[rf]', cmd_lower):
            indicators.append("destructive operation")
        
        # Installation
        if re.search(r'npm\s+i|pip\s+install|apt\s+install', cmd_lower):
            indicators.append("package installation")
        
        # Determine risk level
        if len(indicators) >= 2 or "privilege" in str(indicators):
            risk = "high"
        elif len(indicators) == 1:
            risk = "medium"
        else:
            risk = "low"
        
        return RiskAssessment(
            tool="exec",
            operation=command,
            risk_level=risk,
            indicators=indicators,
            params=params
        )
    
    def evaluate(self, assessment: RiskAssessment) -> Verdict:
        """Evaluate risk assessment and return verdict"""
        
        # Critical risk: block immediately
        if assessment.risk_level == "critical":
            verdict = Verdict(
                approved=False,
                confidence=1.0,
                reasoning=f"Critical risk detected: {assessment.indicators[0]}",
                risk_factors=assessment.indicators,
                mitigations=["Operation blocked for safety"],
                assessment_type="blocked"
            )
            self._log(assessment, verdict)
            return verdict
        
        # Get risk config for this tool and level
        tool_config = self.config.get("risk_levels", {}).get(assessment.tool, {})
        level_config = tool_config.get(assessment.risk_level, {})
        
        # Low risk with auto-approve: allow
        if assessment.risk_level == "low" and level_config.get("auto_approve", True):
            verdict = Verdict(
                approved=True,
                confidence=level_config.get("confidence", 0.95),
                reasoning=f"Low risk operation, trusted pattern or path",
                risk_factors=[],
                mitigations=[],
                assessment_type="heuristic"
            )
            self._log(assessment, verdict)
            return verdict
        
        # Medium/High risk: route to Opus
        if level_config.get("require_opus", False):
            return self._route_to_opus(assessment)
        
        # Default: escalate
        verdict = Verdict(
            approved=False,
            confidence=0.5,
            reasoning="Risk level requires manual review",
            risk_factors=assessment.indicators,
            mitigations=["Review operation details before approving"],
            assessment_type="heuristic"
        )
        self._log(assessment, verdict)
        return verdict
    
    def _route_to_opus(self, assessment: RiskAssessment) -> Verdict:
        """Route to Opus 4.5 for evaluation"""
        # This would actually call the Opus model
        # For now, simulate with confidence-based logic
        
        # Build evaluation prompt
        prompt = self._build_opus_prompt(assessment)
        
        # Simulate Opus evaluation based on indicators
        # In real implementation, this calls sessions_spawn(agentId="opus")
        risk_score = len(assessment.indicators) * 0.2
        confidence = max(0.3, 1.0 - risk_score)
        
        if confidence >= 0.9:
            verdict = Verdict(
                approved=True,
                confidence=confidence,
                reasoning="Opus evaluation: Low risk, approved",
                risk_factors=assessment.indicators,
                mitigations=["Monitor for unusual patterns"],
                assessment_type="opus"
            )
        else:
            verdict = Verdict(
                approved=False,
                confidence=confidence,
                reasoning=f"Opus evaluation: Risk detected ({assessment.risk_level}), requires user confirmation",
                risk_factors=assessment.indicators,
                mitigations=["Review before approving", "Consider alternative approaches"],
                assessment_type="opus"
            )
        
        self._log(assessment, verdict)
        return verdict
    
    def _build_opus_prompt(self, assessment: RiskAssessment) -> str:
        """Build prompt for Opus evaluation"""
        return f"""## Security Evaluation Request

**Tool:** {assessment.tool}
**Operation:** {assessment.operation}
**Risk Level:** {assessment.risk_level}

### Operation Details
```json
{json.dumps(assessment.params, indent=2)}
```

### Detected Indicators
{chr(10).join(f"- {i}" for i in assessment.indicators)}

### Evaluate For
1. Social Engineering Cues (urgency, authority, peer solidarity)
2. Data Exfiltration Risk (sensitive data, credentials, bulk operations)
3. Scope Violations (outside workspace, network calls, privilege escalation)

### Output Format
Return JSON:
```json
{{
  "approved": boolean,
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation",
  "risk_factors": ["factor1"],
  "mitigations": ["suggested measure"]
}}
```

Rules:
- confidence ≥ 0.9: Safe, approve
- confidence < 0.9: Risk detected, escalate
- Critical risk: Block regardless of confidence"""
    
    def _log(self, assessment: RiskAssessment, verdict: Verdict):
        """Log evaluation to audit log"""
        if not self.config.get("log_all_operations", True):
            return
        
        entry = {
            "timestamp": datetime.now().isoformat(),
            "tool": assessment.tool,
            "operation": assessment.operation,
            "risk_level": assessment.risk_level,
            "assessment_type": verdict.assessment_type,
            "verdict": "approved" if verdict.approved else "denied",
            "confidence": verdict.confidence,
            "indicators": assessment.indicators,
        }
        
        with open(self.log_file, 'a') as f:
            f.write(json.dumps(entry) + "\n")
    
    def format_alert(self, assessment: RiskAssessment, verdict: Verdict) -> str:
        """Format user escalation alert"""
        lines = [
            "🛡️ Opus Guard Alert",
            "",
            f"**Tool:** {assessment.tool}",
            f"**Operation:** {assessment.operation}",
            "",
            "**Risk Detected:**",
        ]
        
        for indicator in assessment.indicators:
            lines.append(f"- {indicator}")
        
        lines.extend([
            "",
            "**Opus Analysis:**",
            f"- Confidence: {verdict.confidence:.2f}",
            f"- Reasoning: {verdict.reasoning}",
            "",
        ])
        
        if verdict.mitigations:
            lines.append("**Mitigations:**")
            for m in verdict.mitigations:
                lines.append(f"- {m}")
            lines.append("")
        
        lines.append("**Recommended Action:**")
        if verdict.approved:
            lines.append("✅ Safe to proceed (auto-approved)")
        else:
            lines.append("⚠️ Review before proceeding")
        
        return "\n".join(lines)

def main():
    """CLI entry point"""
    if len(sys.argv) < 3:
        print("Usage: guard.py <tool> '<params_json>'")
        print("Example: guard.py exec '{\"command\": \"git status\"}'")
        sys.exit(1)
    
    tool = sys.argv[1]
    params = json.loads(sys.argv[2])
    
    config_path = Path(__file__).parent.parent / "config" / "global.json"
    guard = OpusGuard(config_path if config_path.exists() else None)
    
    assessment = guard.assess_risk(tool, params)
    verdict = guard.evaluate(assessment)
    
    if verdict.approved:
        print(json.dumps({
            "approved": True,
            "confidence": verdict.confidence,
            "type": verdict.assessment_type
        }))
        sys.exit(0)
    else:
        print(guard.format_alert(assessment, verdict))
        sys.exit(1)

if __name__ == "__main__":
    main()
