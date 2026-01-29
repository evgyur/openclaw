# Shaw Prompts Reference

Полные тексты всех 10 промптов для копирования и использования.

---

## Prompt 1: Plan & Research

```
Plan & Research: Before writing any code, analyze the problem space thoroughly.

Requirements:
(1) Clarify the goal - what exactly needs to be built and why
(2) Identify constraints, dependencies, and edge cases
(3) Research existing patterns, APIs, or libraries that apply
(4) Outline the architecture and data flow
(5) List unknowns and risks

Do not simplify anything or stub it.

Deliverable: A written plan I can review before implementation begins.
Ask clarifying questions if requirements are ambiguous.
```

---

## Prompt 2: Implement Plan

```
Implement Plan: Execute the agreed plan step-by-step.

Requirements:
(1) Follow the plan sequentially, noting any deviations
(2) Write real, functional code - no stubs, placeholders, or TODOs
(3) Handle errors and edge cases as you go
(4) Commit logical chunks with clear explanations

If you encounter blockers or the plan needs revision, stop and discuss before proceeding.

Be careful to always implement fully finished, fully fleshed out working production code.
Do not use try catch or fallbacks or other defensive programming patterns unless necessary.
Do not stub code or TODO or simplify -- always do the most complete version, even if its very complex.
```

---

## Prompt 3: Keep Going

```
Keep Going: Continue working through all remaining tasks until complete.

For each item: implement it fully, verify it works, then move to the next.
Don't stop to ask permission between items.

Be careful to always implement fully finished, fully fleshed out working production code.
Do not use try catch or fallbacks or other defensive programming patterns unless necessary.
Do not stub code or TODO or simplify -- always do the most complete version, even if its very complex.

Provide a final summary of what was completed and anything that remains blocked.

You may run this prompt multiple times to keep the model working through the task list.
```

---

## Prompt 4: Code Quality Pass

```
Code Quality Pass: Review and refactor the current code for quality.

Criteria:
(1) Compact - remove dead code, redundancy, over-abstraction
(2) Concise - simplify verbose logic, use idiomatic patterns
(3) Clean - consistent naming, clear structure, proper formatting
(4) Capable - handles edge cases, fails gracefully, performs well

Make sure work is fully finished.
Show the refactored code with brief explanations of changes.
```

---

## Prompt 5: Thorough Testing

```
Thorough Testing: Review test coverage -- make sure it is expanded beyond the happy path and covers all buttons, routes, flows, code etc.

Requirements:
(1) Test boundary conditions and edge cases
(2) Test error handling and invalid inputs
(3) Test integration points with real dependencies where possible
(4) Test concurrent/async behavior if applicable
(5) Verify actual outputs match expected - inspect the data

Tests must exercise real code paths, not mocks of the code under test.

Very important: NEVER mock anything. Mocking is always slop.
Focus on integration tests against real running code.
```

---

## Prompt 6: LARP Assessment ⭐

```
LARP Assessment: Critically evaluate whether this code is real or performative.

Check for:
(1) Stubbed functions that return fake data
(2) Hardcoded values masquerading as dynamic behavior
(3) Tests that mock away the actual logic being tested
(4) Error handling that silently swallows failures
(5) Async code that doesn't actually await
(6) Validation that doesn't validate
(7) Any code path that hasn't been executed and verified

Report findings honestly.
If something looks functional but isn't proven, flag it.

Once you've done your review, immediately fix every issue, step by step, from most complicated to simplest.
Make sure to have TODOs to keep track.

Arguably the most important prompt. You can run this over and over and find stuff.
```

---

## Prompt 7: Clean Up Slop

```
Clean Up Slop: Remove AI-generated cruft and over-engineering.

Target:
(1) Unnecessary abstractions and wrapper functions
(2) Verbose comments that restate the obvious
(3) Defensive code for impossible conditions
(4) Over-generic solutions for specific problems
(5) Redundant null checks and type assertions
(6) Enterprise patterns in simple scripts
(7) Filler words and hedging in strings/docs

Keep what adds value, delete what adds noise.

Second most important prompt. Deslops the code and comments.
```

---

## Prompt 8: Production Readiness Validation

```
Production Readiness Validation: Final checklist before deployment.

Verify:
(1) All tests pass with real execution, not mocked
(2) Error handling covers failure modes with proper logging
(3) Configuration is externalized, no hardcoded secrets
(4) Performance is acceptable under expected load
(5) Dependencies are pinned and security-scanned
(6) Rollback path exists
(7) Monitoring/alerting is in place

Demonstrate each item is satisfied with evidence, not assertions.
If you find anything that needs to be fixed, make a TODO for it and then do all fix TODOs.
```

---

## Prompt 9: Review Last Task

```
Review Last Task: Audit what was just completed.

Questions:
(1) Does it actually work - did you verify the output?
(2) Does it solve the original problem or just part of it?
(3) Did anything get skipped or deferred?
(4) Are there assumptions that should be documented?
(5) What could break this in production?

Give me an honest assessment, not a confident summary.
After your assessment, make TODOs for each thing that is not completed, and fix.
```

---

## Prompt 0: Fix All Remaining Issues

```
Fix All Remaining Issues: Systematically resolve everything outstanding.

Process:
(1) List every open issue - bugs, TODOs, skipped tests, known limitations
(2) Prioritize by impact
(3) Fix each one completely before moving to the next
(4) Verify each fix with actual execution
(5) Re-run full test suite after each fix to catch regressions

Do not mark complete until zero issues remain.

Be careful to always implement fully finished, fully fleshed out working production code.
Do not use try catch or fallbacks or other defensive programming patterns unless necessary.
Do not stub code or TODO or simplify -- always do the most complete version, even if its very complex.
```

---

## Быстрые ссылки

| Промпт | Триггер | Назначение |
|--------|---------|------------|
| p1 | plan, research | Анализ задачи |
| p2 | implement | Реализация |
| p3 | continue, go | Продолжение |
| p4 | quality | Рефакторинг |
| p5 | test | Тестирование |
| p6 | larp | Проверка на фейк |
| p7 | cleanup, deslop | Чистка |
| p8 | prod, deploy | Production ready |
| p9 | review | Аудит |
| p0 | fix | Финал |
