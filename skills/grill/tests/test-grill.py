#!/usr/bin/env python3
"""
Test suite for Grill analyzer
"""

import sys
import json
from pathlib import Path

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from grill_analyzer import GrillAnalyzer, Issue

def test_must_fix_patterns():
    """Test detection of MUST_FIX patterns"""
    analyzer = GrillAnalyzer()
    
    test_cases = [
        {
            "code": "eval(userInput)",
            "expected_pattern": "eval",
            "expected_severity": "MUST_FIX"
        },
        {
            "code": "element.innerHTML = htmlContent",
            "expected_pattern": "innerHTML",
            "expected_severity": "MUST_FIX"
        },
        {
            "code": "DROP TABLE users",
            "expected_pattern": "DROP TABLE",
            "expected_severity": "MUST_FIX"
        },
    ]
    
    for tc in test_cases:
        analyzer.issues = []
        analyzer._check_patterns("test.ts", 1, tc["code"])
        
        assert len(analyzer.issues) > 0, f"Should detect {tc['expected_pattern']}"
        issue = analyzer.issues[0]
        assert issue.severity == tc["expected_severity"], \
            f"{tc['expected_pattern']} should be {tc['expected_severity']}"
        assert tc["expected_pattern"] in issue.title or tc["expected_pattern"] in issue.description.lower()
    
    print("✅ MUST_FIX pattern detection tests passed")

def test_consider_patterns():
    """Test detection of CONSIDER patterns"""
    analyzer = GrillAnalyzer()
    
    test_cases = [
        ("console.log('debug')", "console.log", "CONSIDER"),
        ("// TODO: implement later", "TODO:", "CONSIDER"),
        ("// FIXME: broken code", "FIXME:", "CONSIDER"),
        ("@ts-ignore @ts-nocheck", "@ts-ignore", "CONSIDER"),
    ]
    
    for code, pattern, severity in test_cases:
        analyzer.issues = []
        analyzer._check_patterns("test.ts", 1, code)
        
        found = any(
            pattern in i.title or pattern in i.description.lower()
            for i in analyzer.issues
        )
        assert found, f"Should detect {pattern}"
        assert any(i.severity == severity for i in analyzer.issues)
    
    print("✅ CONSIDER pattern detection tests passed")

def test_edge_case_detection():
    """Test edge case identification"""
    analyzer = GrillAnalyzer()
    
    test_cases = [
        ("if (arr.length) { process() }", "Missing empty array check"),
        ("await fetch(url)", "Missing error handling"),
        ("JSON.parse(data)", "Missing JSON parse error handling"),
        ("parseInt(userInput)", "Missing NaN check"),
    ]
    
    for code, expected in test_cases:
        analyzer.issues = []
        analyzer._check_edge_cases("test.ts", 1, code)
        
        found = any(expected in i.title for i in analyzer.issues)
        assert found, f"Should detect: {expected}"
    
    print("✅ Edge case detection tests passed")

def test_missing_tests():
    """Test detection of missing tests"""
    analyzer = GrillAnalyzer()
    
    changes = [
        {"file": "src/api/users.ts", "hunks": [{"lines": ["+export function", "+function createUser()"]}]},
    ]
    
    analyzer._check_missing_tests(changes)
    
    assert len(analyzer.issues) > 0, "Should flag missing test file"
    assert any(i.category == "missing_tests" for i in analyzer.issues)
    
    print("✅ Missing tests detection tests passed")

def test_report_formatting():
    """Test report generation"""
    analyzer = GrillAnalyzer()
    
    # Add some test issues
    analyzer.issues = [
        Issue(
            severity="MUST_FIX",
            category="code_quality",
            title="Test Issue",
            file="test.ts",
            lines="1",
            description="Test description",
            suggestion="Test suggestion",
            code_snippet="console.log('test')",
        ),
        Issue(
            severity="CONSIDER",
            category="missing_tests",
            title="Consider Issue",
            file="test.ts",
            lines="2",
            description="Consider description",
            suggestion="Consider suggestion",
        ),
    ]
    
    report = analyzer.format_report("test-branch", "main")
    
    assert "🔥 Grill Report" in report
    assert "🚨 MUST_FIX (1)" in report
    assert "⚠️ CONSIDER (1)" in report
    assert "Test Issue" in report
    assert "Consider Issue" in report
    
    print("✅ Report formatting tests passed")

def run_all_tests():
    """Run all Grill tests"""
    print("🔥 Running Grill Test Suite\n")
    
    try:
        test_must_fix_patterns()
        test_consider_patterns()
        test_edge_case_detection()
        test_missing_tests()
        test_report_formatting()
        
        print("\n✅ All Grill tests passed!")
        return 0
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        return 1
    except Exception as e:
        print(f"\n💥 Error running tests: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(run_all_tests())
