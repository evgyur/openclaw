#!/usr/bin/env python3
"""
Grill Analyzer — Git diff analysis engine
Detects missing tests, edge cases, hacky shortcuts, breaking changes
"""

import re
import json
import subprocess
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

@dataclass
class Issue:
    """Represents a single issue found in the diff"""
    severity: str  # MUST_FIX, CONSIDER, NIT
    category: str  # missing_tests, edge_cases, hacky_shortcuts, breaking_changes, code_quality
    title: str
    file: str
    lines: str  # e.g., "45-52" or "67"
    description: str
    suggestion: str
    code_snippet: Optional[str] = None

class GrillAnalyzer:
    """Main analyzer for git diffs"""
    
    def __init__(self, config_path: Optional[Path] = None):
        self.config = self._load_config(config_path)
        self.issues: List[Issue] = []
        
    def _load_config(self, config_path: Optional[Path]) -> Dict[str, Any]:
        """Load configuration from file or use defaults"""
        default_config = {
            "patterns": {
                "must_fix": [
                    r"eval\(",
                    r"dangerouslySetInnerHTML",
                    r"process\.env\.[A-Z_]+ =",
                    r"DROP TABLE",
                    r"\.innerHTML\s*=",
                    r"exec\(",
                    r"system\(",
                ],
                "consider": [
                    r"console\.log\(",
                    r"debugger;",
                    r"setTimeout\(.*,\s*0\)",
                    r"TODO:",
                    r"FIXME:",
                    r"HACK:",
                ],
                "nit": [
                    r"var\s+",
                    r"==\s*[^=]",  # == instead of ===
                ]
            },
            "ignore_paths": [
                "dist/*",
                "node_modules/*",
                "*.generated.*",
                "*.lock",
                "package-lock.json",
                "pnpm-lock.yaml",
            ],
            "test_patterns": [
                "*.test.ts",
                "*.spec.ts",
                "*.test.js",
                "*.spec.js",
                "__tests__/**",
                "tests/**",
            ],
            "severity": "balanced",  # strict, balanced, lenient
            "require_tests": True,
        }
        
        if config_path and config_path.exists():
            with open(config_path) as f:
                user_config = json.load(f)
                default_config.update(user_config)
        
        return default_config
    
    def analyze_diff(self, base: str = "main", head: str = "HEAD") -> List[Issue]:
        """Analyze git diff between base and head"""
        self.issues = []
        
        # Get diff
        try:
            diff = self._get_diff(base, head)
        except subprocess.CalledProcessError as e:
            print(f"Error getting diff: {e}", file=sys.stderr)
            return []
        
        # Parse diff into file changes
        changes = self._parse_diff(diff)
        
        # Analyze each changed file
        for change in changes:
            self._analyze_file_change(change)
        
        # Check for missing tests
        if self.config.get("require_tests", True):
            self._check_missing_tests(changes)
        
        # Check for breaking changes
        self._check_breaking_changes(changes)
        
        return self.issues
    
    def _get_diff(self, base: str, head: str) -> str:
        """Get git diff between base and head"""
        result = subprocess.run(
            ["git", "diff", f"{base}...{head}"],
            capture_output=True,
            text=True,
            check=True,
            timeout=30
        )
        return result.stdout
    
    def _parse_diff(self, diff: str) -> List[Dict[str, Any]]:
        """Parse git diff into structured changes"""
        changes = []
        current_file = None
        current_hunks = []
        
        for line in diff.split("\n"):
            if line.startswith("diff --git"):
                # Save previous file
                if current_file:
                    changes.append({
                        "file": current_file,
                        "hunks": current_hunks,
                    })
                
                # Start new file
                match = re.search(r"b/(.+)$", line)
                current_file = match.group(1) if match else None
                current_hunks = []
                
            elif line.startswith("@@"):
                # Parse hunk header
                match = re.search(r"@@ -(\d+),?\d* \+(\d+),?\d* @@", line)
                if match:
                    current_hunks.append({
                        "old_start": int(match.group(1)),
                        "new_start": int(match.group(2)),
                        "lines": [],
                    })
            elif current_hunks:
                # Add line to current hunk
                current_hunks[-1]["lines"].append(line)
        
        # Save last file
        if current_file:
            changes.append({
                "file": current_file,
                "hunks": current_hunks,
            })
        
        return changes
    
    def _analyze_file_change(self, change: Dict[str, Any]):
        """Analyze a single file change"""
        file_path = change["file"]
        
        # Skip ignored paths
        if self._should_ignore_file(file_path):
            return
        
        # Analyze each hunk
        for hunk in change["hunks"]:
            added_lines = [l[1:] for l in hunk["lines"] if l.startswith("+")]
            content = "\n".join(added_lines)
            
            # Check patterns
            self._check_patterns(file_path, hunk["new_start"], content)
            
            # Check edge cases
            self._check_edge_cases(file_path, hunk["new_start"], content)
            
            # Check code quality
            self._check_code_quality(file_path, hunk["new_start"], content)
    
    def _should_ignore_file(self, file_path: str) -> bool:
        """Check if file should be ignored"""
        for pattern in self.config["ignore_paths"]:
            if Path(file_path).match(pattern):
                return True
        return False
    
    def _check_patterns(self, file_path: str, line_start: int, content: str):
        """Check for configured patterns"""
        # MUST_FIX patterns
        for pattern in self.config["patterns"]["must_fix"]:
            if re.search(pattern, content, re.IGNORECASE):
                self.issues.append(Issue(
                    severity="MUST_FIX",
                    category="code_quality",
                    title=f"Dangerous pattern detected: {pattern}",
                    file=file_path,
                    lines=str(line_start),
                    description=f"Code contains potentially dangerous pattern: {pattern}",
                    suggestion="Review and replace with safer alternative",
                    code_snippet=self._extract_snippet(content, pattern),
                ))
        
        # CONSIDER patterns
        for pattern in self.config["patterns"]["consider"]:
            if re.search(pattern, content, re.IGNORECASE):
                self.issues.append(Issue(
                    severity="CONSIDER",
                    category="hacky_shortcuts",
                    title=f"Potential issue: {pattern}",
                    file=file_path,
                    lines=str(line_start),
                    description=f"Code contains pattern that may need review: {pattern}",
                    suggestion="Consider removing or addressing before merge",
                ))
        
        # NIT patterns
        for pattern in self.config["patterns"]["nit"]:
            if re.search(pattern, content):
                self.issues.append(Issue(
                    severity="NIT",
                    category="code_quality",
                    title=f"Code style suggestion: {pattern}",
                    file=file_path,
                    lines=str(line_start),
                    description=f"Consider modern alternative to: {pattern}",
                    suggestion="Optional improvement for code quality",
                ))
    
    def _extract_snippet(self, content: str, pattern: str) -> str:
        """Extract code snippet around pattern match"""
        match = re.search(pattern, content, re.IGNORECASE)
        if not match:
            return ""
        
        lines = content.split("\n")
        for i, line in enumerate(lines):
            if pattern in line or re.search(pattern, line, re.IGNORECASE):
                start = max(0, i - 1)
                end = min(len(lines), i + 2)
                return "\n".join(lines[start:end])
        return ""
    
    def _check_edge_cases(self, file_path: str, line_start: int, content: str):
        """Check for missing edge case handling"""
        edge_cases = [
            (r"if\s*\(\s*(\w+)\.length\s*\)", "Missing empty array check", "Check for empty array before accessing"),
            (r"if\s*\(\s*(\w+)\s*\)", "Missing null/undefined check", "Use explicit null/undefined checks"),
            (r"parseInt\(", "Missing NaN check", "Check for NaN after parseInt"),
            (r"await\s+fetch\(", "Missing error handling", "Add try-catch for fetch errors"),
            (r"JSON\.parse\(", "Missing JSON parse error handling", "Wrap in try-catch"),
        ]
        
        for pattern, title, suggestion in edge_cases:
            if re.search(pattern, content):
                self.issues.append(Issue(
                    severity="CONSIDER",
                    category="edge_cases",
                    title=title,
                    file=file_path,
                    lines=str(line_start),
                    description=f"Code may not handle edge cases properly",
                    suggestion=suggestion,
                ))
    
    def _check_code_quality(self, file_path: str, line_start: int, content: str):
        """Check code quality issues"""
        # Check for hardcoded values
        if re.search(r'["\'](?:https?://|/api/|/v\d+/)', content):
            self.issues.append(Issue(
                severity="CONSIDER",
                category="code_quality",
                title="Hardcoded URL/path",
                file=file_path,
                lines=str(line_start),
                description="URL or path is hardcoded",
                suggestion="Extract to configuration or constant",
            ))
        
        # Check for magic numbers
        if re.search(r'\b(42|100|1000|3600)\b', content):
            self.issues.append(Issue(
                severity="NIT",
                category="code_quality",
                title="Magic number",
                file=file_path,
                lines=str(line_start),
                description="Numeric literal without clear meaning",
                suggestion="Extract to named constant",
            ))
    
    def _check_missing_tests(self, changes: List[Dict[str, Any]]):
        """Check for changed files without corresponding test changes"""
        source_files = [c["file"] for c in changes if not self._is_test_file(c["file"])]
        test_files = [c["file"] for c in changes if self._is_test_file(c["file"])]
        
        for source_file in source_files:
            # Skip non-code files
            if not source_file.endswith((".ts", ".js", ".py", ".go")):
                continue
            
            # Look for corresponding test file
            expected_test = self._get_expected_test_file(source_file)
            
            if expected_test not in test_files:
                self.issues.append(Issue(
                    severity="CONSIDER",
                    category="missing_tests",
                    title="Missing test updates",
                    file=source_file,
                    lines="",
                    description=f"Source file changed but no test file updated",
                    suggestion=f"Update or create {expected_test}",
                ))
    
    def _is_test_file(self, file_path: str) -> bool:
        """Check if file is a test file"""
        for pattern in self.config["test_patterns"]:
            if Path(file_path).match(pattern):
                return True
        return False
    
    def _get_expected_test_file(self, source_file: str) -> str:
        """Get expected test file path for source file"""
        path = Path(source_file)
        
        # Try same directory with .test extension
        test_name = f"{path.stem}.test{path.suffix}"
        return str(path.parent / test_name)
    
    def _check_breaking_changes(self, changes: List[Dict[str, Any]]):
        """Check for potential breaking changes"""
        for change in changes:
            file_path = change["file"]
            
            # Check package.json for dependency changes
            if file_path == "package.json":
                self.issues.append(Issue(
                    severity="CONSIDER",
                    category="breaking_changes",
                    title="package.json modified",
                    file=file_path,
                    lines="",
                    description="Dependency changes may affect compatibility",
                    suggestion="Review dependency updates for breaking changes",
                ))
            
            # Check for database migrations
            if "migration" in file_path.lower() or "schema" in file_path.lower():
                self.issues.append(Issue(
                    severity="MUST_FIX",
                    category="breaking_changes",
                    title="Database schema change",
                    file=file_path,
                    lines="",
                    description="Database changes require migration strategy",
                    suggestion="Ensure rollback plan and migration docs exist",
                ))
    
    def format_report(self, branch: str, base: str = "main") -> str:
        """Format issues into a readable report"""
        # Group by severity
        must_fix = [i for i in self.issues if i.severity == "MUST_FIX"]
        consider = [i for i in self.issues if i.severity == "CONSIDER"]
        nit = [i for i in self.issues if i.severity == "NIT"]
        
        lines = [
            f"🔥 Grill Report — {branch}",
            f"Base: {base}...HEAD ({len(self.issues)} issues found)",
            "",
            "━" * 60,
        ]
        
        # MUST_FIX section
        if must_fix:
            lines.append("")
            lines.append(f"## 🚨 MUST_FIX ({len(must_fix)})")
            lines.append("")
            for i, issue in enumerate(must_fix, 1):
                lines.extend(self._format_issue(i, issue))
        
        # CONSIDER section
        if consider:
            lines.append("")
            lines.append("━" * 60)
            lines.append("")
            lines.append(f"## ⚠️ CONSIDER ({len(consider)})")
            lines.append("")
            for i, issue in enumerate(consider, 1):
                lines.extend(self._format_issue(i, issue))
        
        # NIT section
        if nit:
            lines.append("")
            lines.append("━" * 60)
            lines.append("")
            lines.append(f"## 💡 NIT ({len(nit)})")
            lines.append("")
            for i, issue in enumerate(nit, 1):
                lines.extend(self._format_issue(i, issue))
        
        # Summary
        lines.append("")
        lines.append("━" * 60)
        lines.append("")
        lines.append("## Summary")
        lines.append("")
        lines.append(f"- 🚨 {len(must_fix)} MUST_FIX — {'**blocking merge**' if must_fix else 'none'}")
        lines.append(f"- ⚠️ {len(consider)} CONSIDER — {'need acknowledgment' if consider else 'none'}")
        lines.append(f"- 💡 {len(nit)} NIT — optional")
        lines.append("")
        
        if must_fix:
            lines.append("**Status:** ❌ NOT READY — address MUST_FIX items first")
        elif consider:
            lines.append("**Status:** ⚠️ READY WITH NOTES — review CONSIDER items")
        else:
            lines.append("**Status:** ✅ CLEAN — looks good to merge!")
        
        return "\n".join(lines)
    
    def _format_issue(self, index: int, issue: Issue) -> List[str]:
        """Format a single issue"""
        lines = [
            f"### {index}. {issue.title}",
            f"**File:** {issue.file}" + (f":{issue.lines}" if issue.lines else ""),
            f"**Issue:** {issue.description}",
            f"**Fix:** {issue.suggestion}",
        ]
        
        if issue.code_snippet:
            lines.append("```")
            lines.append(issue.code_snippet)
            lines.append("```")
        
        lines.append("")
        return lines

def main():
    """CLI entry point"""
    if len(sys.argv) < 2:
        print("Usage: grill-analyzer.py <branch> [--base <base>]")
        sys.exit(1)
    
    branch = sys.argv[1]
    base = "main"
    
    # Parse --base option
    if "--base" in sys.argv:
        idx = sys.argv.index("--base")
        if idx + 1 < len(sys.argv):
            base = sys.argv[idx + 1]
    
    # Load config
    config_path = Path(__file__).parent.parent / ".grill-config.json"
    
    # Analyze
    analyzer = GrillAnalyzer(config_path if config_path.exists() else None)
    analyzer.analyze_diff(base=base, head="HEAD")
    
    # Print report
    print(analyzer.format_report(branch, base))
    
    # Exit code: non-zero if MUST_FIX items
    must_fix_count = len([i for i in analyzer.issues if i.severity == "MUST_FIX"])
    sys.exit(1 if must_fix_count > 0 else 0)

if __name__ == "__main__":
    main()
