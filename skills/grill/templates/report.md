# 🔥 Grill Report — {branch}

**Base:** {base}...HEAD ({file_count} files changed, {added} +{removed} -)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚨 MUST_FIX ({must_fix_count})

{{for each MUST_FIX issue:}}

### {number}. {title}

**File:** {file}{lines}
**Category:** {category}
**Issue:** {description}
**Fix:** {suggestion}

```{language}
{code_snippet}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ⚠️ CONSIDER ({consider_count})

{{for each CONSIDER issue:}}

### {number}. {title}

**File:** {file}{lines}
**Category:** {category}
**Issue:** {description}
**Suggestion:** {suggestion}

{{end for}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 💡 NIT ({nit_count})

{{for each NIT issue:}}

### {number}. {title}

**File:** {file}{lines}
**Issue:** {description}
**Suggestion:** {suggestion}

{{end for}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Summary

- 🚨 {must_fix_count} MUST_FIX — **{{if must_fix_count > 0}}blocking merge{{else}}none{{endif}}**
- ⚠️ {consider_count} CONSIDER — {{if consider_count > 0}}need acknowledgment{{else}}none{{endif}}
- 💡 {nit_count} NIT — optional

**Status:** 
{{if must_fix_count > 0}}❌ NOT READY — address MUST_FIX items first
{{elif consider_count > 0}}⚠️ READY WITH NOTES — review CONSIDER items
{{else}}✅ CLEAN — looks good to merge!
{{endif}}

## Next Steps

{{if must_fix_count > 0}}
1. Fix all MUST_FIX items
2. Run `/grill --recheck` to verify
3. Address CONSIDER items if desired
{{elif consider_count > 0}}
1. Review CONSIDER items
2. Acknowledge or fix each one
3. Run `/grill --recheck` when ready
{{else}}
1. Create PR with confidence ✅
{{endif}}
