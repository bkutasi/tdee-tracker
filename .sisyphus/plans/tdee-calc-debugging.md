# TDEE Calculation Debugging Plan (Research-Backed)

## TL;DR

> **Quick Summary**: Validate and enhance TDEE calculations against NIH/Kevin Hall research standards. Current formula is correct (Hall & Chow, 2011) but needs water weight detection and improved confidence scoring. User wants systematic validation with 5 test scenarios.
> 
> **Deliverables**:
> - Research-backed test suite (5 scenarios: maintenance, cutting, bulking, water weight, gaps)
> - Water weight detection (>1kg/week flags as unreliable)
> - Enhanced confidence scoring (duration, completeness, volatility, weekend coverage)
> - Validation against controlled test datasets
> 
> **Research Basis**: Hall & Chow (Am J Clin Nutr, 2011), Singh et al. (Eur J Clin Nutr, 2025), NIH energy balance model
> **Estimated Effort**: Medium (3-4 hours)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Test generation → Water weight detection → Confidence enhancement → Validation

---

## Context

### Original Request
User reported: "7-day and 14-day moving averages and recommended intake values showing bugs. 7-Day Trend shows 787 (absolutely not possible), 14-Day shows 2,590. Confidence always Low (Gap) even with full week data."

### Interview Summary
**Key Discussions**:
- **User expectation**: Systematic validation with controlled test data, not just fixing symptoms
- **Test scenarios requested**: ALL 5 — maintenance, cutting, bulking, water weight, gaps
- **Validation method**: Research-backed reference model (NIH/Kevin Hall standards)
- **Priority**: "Everything" — comprehensive fix, not band-aid
- **Data pattern**: Real-world noisy data with water weight fluctuations

**Research Findings** (Authoritative Sources):
- **Formula verification**: ✅ Current TDEE formula matches Hall & Chow (Am J Clin Nutr, 2011)
- **Energy density**: 7,716 cal/kg is simplified but acceptable for ≥14 day periods
- **Minimum duration**: Research recommends 14 days (Hall & Chow), current MIN_TRACKED_DAYS=4 is too low
- **Water weight**: >1kg/week without calorie correlation = likely water, should reduce confidence
- **Confidence scoring**: Should include duration (40%), completeness (25%), volatility (20%), weekend coverage (15%)

**What's CORRECT**:
- ✅ TDEE formula (Hall & Chow energy balance model)
- ✅ EWMA smoothing (similar to 7-day moving average)
- ✅ Gap handling (conservative approach)

**What NEEDS ENHANCEMENT**:
- ❌ Confidence scoring too simple (only days, no other factors)
- ❌ No water weight detection/flagging
- ❌ MIN_TRACKED_DAYS = 4 (should be 7 minimum, recommend 14)
- ❌ No confidence intervals (Hall & Chow formula)

### Metis Review
**Identified Gaps** (addressed):
- Missing weight delta validation (>1kg/week changes likely water)
- Confidence scoring too simple (penalizes gaps but ignores data quality)
- No maintenance scenario handling (stable weight not explicitly detected)
- Test gaps (no tests for unrealistic weight swings)

---

## Work Objectives

### Core Objective
Validate TDEE calculations against NIH/Kevin Hall research standards and enhance confidence scoring to handle real-world noisy data (water weight, tracking gaps, inconsistent logging).

### Concrete Deliverables
- `tests/calculator.test.js` — 5 research-backed test scenarios with controlled data
- `js/calculator-tdee.js` — Water weight detection (>1kg/week flags as unreliable)
- `js/calculator-tdee.js` — Enhanced confidence scoring (duration, completeness, volatility, weekend coverage)
- `scripts/validate-tdee.js` — Validation script with controlled test datasets

### Definition of Done
- [ ] All 5 test scenarios pass (maintenance, cutting, bulking, water weight, gaps)
- [ ] Water weight detected and flagged (>1kg/week without calorie correlation)
- [ ] Confidence scoring reflects research standards (Hall & Chow, Singh et al.)
- [ ] All existing tests pass: `node tests/node-test.js`
- [ ] Validation script confirms calculations match expected values

### Must Have
- Water weight validation (>1kg/week flags as unreliable, reduces confidence)
- Enhanced confidence scoring (4 factors: duration 40%, completeness 25%, volatility 20%, weekend coverage 15%)
- Research-backed test scenarios (controlled datasets with known outcomes)
- Backward compatible (doesn't break existing calculations)

### Must NOT Have (Guardrails)
- ❌ Do NOT change core TDEE formula (Hall & Chow formula is correct)
- ❌ Do NOT remove gap detection (working as intended)
- ❌ Do NOT add user education/UI changes (focus on calculation validation only)
- ❌ Do NOT add unrelated test coverage (focus on 5 requested scenarios)
- ❌ Do NOT modify BMR calculations (separate, working correctly)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: YES (custom test framework, 155+ tests)
- **Automated tests**: TDD (tests first, then implementation)
- **Framework**: Custom test framework (follow `tests/calculator.test.js` patterns)
- **If TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios (see TODO template below).
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Test Scripts**: Use Bash (Node.js) — Run test files, assert output
- **Browser QA**: Use Playwright — Navigate to app, verify displayed values
- **Data Validation**: Use Bash — Parse JSON, verify calculations match expected

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — Foundation + Test Generation):
├── Task 1: Create validation script with controlled datasets [quick]
├── Task 2: Add 5 research-backed test scenarios [unspecified-high]
├── Task 3: Analyze current calculation output [quick]
└── Task 4: Document expected values per research standards [quick]

Wave 2 (After Wave 1 — Core Enhancements):
├── Task 5: Add water weight detection [deep]
├── Task 6: Validate against controlled datasets [quick]
└── Task 7: Enhance confidence scoring [unspecified-high]

Wave 3 (After Wave 2 — Integration + Validation):
├── Task 8: (SKIPPED - merged into Task 7)
├── Task 9: Run full test suite, fix regressions [quick]
├── Task 10: Browser QA with user's data [visual-engineering]
├── Task 11: Verify Excel parity [quick]
└── Task 12: Documentation update [writing]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 2 → Task 5 → Task 7 → Task 9 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Waves 1 & 3)
```

### Dependency Matrix

- **1**: — — 2, 3, 4
- **2**: — — 5, 7
- **3**: 1 — 5
- **4**: 1, 3 — 7
- **5**: 2, 3 — 6, 9, 10
- **6**: 5 — 9, 10
- **7**: 2, 4 — 9, 10
- **9**: 5, 6, 7 — 10, 11, 12, F1-F4
- **10**: 5, 6, 7, 9 — 11, F1-F4
- **11**: 9, 10 — 12, F1-F4
- **12**: 11 — F1-F4

### Agent Dispatch Summary

- **Wave 1**: **4 tasks** — T1 → `quick`, T2 → `unspecified-high`, T3 → `quick`, T4 → `quick`
- **Wave 2**: **3 tasks** — T5 → `deep`, T6 → `quick`, T7 → `unspecified-high`
- **Wave 3**: **4 tasks** — T8 → SKIPPED, T9 → `quick`, T10 → `visual-engineering`, T11 → `quick`, T12 → `writing`
- **FINAL**: **4 tasks** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Create Debug Script with User's Data

  **What to do**:
  - Create `scripts/debug-tdee.js` that loads sample_data_export.json
  - Calculate 7-day and 14-day TDEE using current Calculator functions
  - Log intermediate values: EWMA weights, weight delta, avg calories, tracked days
  - Output comparison: expected vs actual TDEE values
  - Run with: `node scripts/debug-tdee.js`

  **Must NOT do**:
  - Do NOT modify production code
  - Do NOT fix anything yet — just observe and log
  - Do NOT add tests in this task

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Script creation, data analysis, no complex logic
  - **Skills**: `[]`
    - No specialized skills needed — pure JavaScript data processing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 3, 4, 5, 6
  - **Blocked By**: None (can start immediately)

  **References**:
  - `sample_data_export.json` - User's actual data for debugging
  - `js/calculator-tdee.js:289` - calculateFastTDEE function to call
  - `js/calculator-tdee.js:712` - calculateStableTDEE function to call
  - `tests/calculator.test.js:1-50` - Test setup pattern to follow

  **Acceptance Criteria**:
  - [ ] Script runs without errors: `node scripts/debug-tdee.js`
  - [ ] Logs 7-day TDEE calculation steps
  - [ ] Logs 14-day TDEE calculation steps
  - [ ] Shows weight delta, avg calories, tracked days
  - [ ] Output saved to `.sisyphus/evidence/task-1-debug-output.txt`

  **QA Scenarios**:

  ```
  Scenario: Script executes successfully
    Tool: Bash
    Preconditions: sample_data_export.json exists in root
    Steps:
      1. Run: node scripts/debug-tdee.js
      2. Verify exit code is 0
      3. Verify output contains "7-Day TDEE:" and "14-Day TDEE:"
    Expected Result: Exit code 0, output shows both TDEE values
    Failure Indicators: Script crashes, missing output labels
    Evidence: .sisyphus/evidence/task-1-debug-output.txt
  ```

  **Commit**: YES (groups with 2, 3, 4)
  - Message: `debug(tdee): add calculation debug script`
  - Files: `scripts/debug-tdee.js`
  - Pre-commit: `node scripts/debug-tdee.js`

- [x] 2. Add Research-Backed Test Scenarios (5 Scenarios)

  **What to do**:
  Generate controlled test datasets for ALL 5 scenarios you requested:
  
  1. **Maintenance scenario**: Stable weight (±0.1kg), consistent calories (2500/day) → TDEE ≈ 2500
  2. **Cutting scenario**: Linear weight loss (0.5kg/week), consistent calories (2000/day) → TDEE ≈ 2554
  3. **Bulking scenario**: Linear weight gain (0.5kg/week), consistent calories (3000/day) → TDEE ≈ 2446
  4. **Water weight scenario**: Sudden +2.4kg/week without calorie increase → Flag as unreliable
  5. **Gap scenario**: Missing 2-3 days/week, 14+ total days → Maintain estimate, reduce confidence
  
  Follow AAA pattern from existing tests. Tests should FAIL initially for scenarios 4-5 (proving gaps exist).

  **Must NOT do**:
  - Do NOT implement fixes yet
  - Do NOT modify calculator code
  - Do NOT skip failing tests

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Test design requires understanding research standards and calculation logic
  - **Skills**: `[]`
    - Follow existing test patterns in calculator.test.js

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 5, 6, 7, 8 (implementation depends on test specs)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `tests/calculator.test.js:1200-1300` - Excel parity test pattern
  - `tests/calculator.test.js:330-380` - calculateStableTDEE tests
  - Hall & Chow (2011) - TDEE formula: TDEE = avgCalories + ((-ΔWeight × 7716) / trackedDays)
  - Singh et al. (2025) - Minimum 4-5 days for r=0.9 reliability

  **Acceptance Criteria**:
  - [ ] Test file has 5 new test scenarios with controlled datasets
  - [ ] Tests follow AAA pattern (Arrange, Act, Assert)
  - [ ] Tests use floating-point safe assertions (Calculator.round)
  - [ ] Scenarios 4-5 FAIL initially (proving gaps exist)
  - [ ] Test output saved to `.sisyphus/evidence/task-2-failing-tests.txt`

  **QA Scenarios**:

  ```
  Scenario: Tests fail as expected (TDD)
    Tool: Bash
    Preconditions: Test file created with 5 scenarios
    Steps:
      1. Run: node tests/node-test.js 2>&1 | grep -A2 "water weight\|gap scenario"
      2. Verify output shows "FAILED" or assertion errors for scenarios 4-5
      3. Count failing tests (should be 2: water weight and gap handling)
    Expected Result: Scenarios 4-5 fail with clear assertion messages
    Failure Indicators: All tests pass (wrong - gaps not reproduced), syntax errors
    Evidence: .sisyphus/evidence/task-2-failing-tests.txt
  ```

  **Commit**: YES (groups with 1, 3, 4)
  - Message: `test(tdee): add 5 research-backed validation scenarios (TDD - failing)`
  - Files: `tests/calculator.test.js`
  - Pre-commit: `node tests/node-test.js`

- [x] 3. Analyze Current Calculation Output

  **What to do**:
  - Run debug script from Task 1
  - Manually calculate expected 7-day TDEE from user's data
  - Compare: calculated vs expected values
  - Identify which step produces wrong value (EWMA, delta, avg calories?)
  - Document findings in task comments

  **Must NOT do**:
  - Do NOT modify code
  - Do NOT skip analysis steps
  - Do NOT assume root cause — verify with data

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Data analysis, comparison, documentation
  - **Skills**: `[]`
    - Basic arithmetic and data comparison

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Tasks 5, 6 (need analysis before fixing)
  - **Blocked By**: Task 1 (needs debug script)

  **References**:
  - `sample_data_export.json:20-61` - Last 7 days of user data
  - `js/calculator-tdee.js:289-379` - calculateFastTDEE implementation
  - Task 1 output - Debug script results

  **Acceptance Criteria**:
  - [ ] Manual calculation matches or differs from script output
  - [ ] Root cause identified (which variable is wrong)
  - [ ] Analysis documented in task comments
  - [ ] Evidence saved to `.sisyphus/evidence/task-3-analysis.md`

  **QA Scenarios**:

  ```
  Scenario: Analysis is complete and documented
    Tool: Bash
    Preconditions: Task 1 debug output exists
    Steps:
      1. Read .sisyphus/evidence/task-1-debug-output.txt
      2. Verify analysis document exists
      3. Verify analysis identifies specific root cause (not vague)
    Expected Result: Analysis document with specific root cause (file:line reference)
    Failure Indicators: Vague analysis ("something is wrong"), missing document
    Evidence: .sisyphus/evidence/task-3-analysis.md
  ```

  **Commit**: YES (groups with 1, 2, 4)
  - Message: `debug(tdee): document calculation analysis`
  - Files: `.sisyphus/evidence/task-3-analysis.md`
  - Pre-commit: None (evidence file)

- [x] 4. Document Expected vs Actual Values

  **What to do**:
  - Create specification: what SHOULD 7-day TDEE show for user's data?
  - Create specification: what SHOULD 14-day TDEE show?
  - Define "realistic" bounds (e.g., 1200-4000 cal for adult male)
  - Document confidence scoring expectations
  - Get user confirmation (via plan comments)

  **Must NOT do**:
  - Do NOT implement fixes based on specs yet
  - Do NOT assume user's expectations — document explicitly
  - Do NOT skip user confirmation step

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Documentation, specification writing
  - **Skills**: `[]`
    - Technical writing, requirement specification

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Tasks 5, 7 (need specs before implementing)
  - **Blocked By**: Task 1, 3 (need analysis first)

  **References**:
  - Task 3 analysis - Root cause findings
  - `sample_data_export.json` - User's data context
  - `js/calculator-tdee.js:712-746` - Stable TDEE (more reliable reference)

  **Acceptance Criteria**:
  - [ ] Specification document created
  - [ ] Expected 7-day TDEE range defined
  - [ ] Expected 14-day TDEE range defined
  - [ ] Confidence scoring criteria documented
  - [ ] Document saved to `.sisyphus/evidence/task-4-specs.md`

  **QA Scenarios**:

  ```
  Scenario: Specification is complete and actionable
    Tool: Bash
    Preconditions: Task 3 analysis complete
    Steps:
      1. Read .sisyphus/evidence/task-4-specs.md
      2. Verify expected values are concrete (not ranges like "reasonable")
      3. Verify confidence criteria are measurable
    Expected Result: Specification with concrete expected values
    Failure Indicators: Vague specs ("should be correct"), missing criteria
    Evidence: .sisyphus/evidence/task-4-specs.md
  ```

  **Commit**: YES (groups with 1, 2, 3)
  - Message: `docs(tdee): document expected calculation values`
  - Files: `.sisyphus/evidence/task-4-specs.md`
  - Pre-commit: None (evidence file)

- [x] 5. Add Water Weight Detection

  **What to do**:
  Implement water weight detection based on research findings:
  
  **Detection criteria** (per Hall & Chow, Kreitzman et al.):
  - Weight change >1kg/week without corresponding calorie change (>500 cal difference)
  - Sudden weight swing (>2kg in 3 days)
  - Weight gain during calorie deficit (physiologically impossible as fat/muscle)
  
  **Response**:
  - Flag TDEE as "unreliable" (return null for Fast TDEE, fall back to Stable TDEE)
  - Reduce confidence score by 20 points
  - Continue tracking (don't reject data)
  
  Follow existing pattern from calorie outlier detection (`excludeCalorieOutliers`)

  **Must NOT do**:
  - Do NOT change core TDEE formula (Hall & Chow formula is correct)
  - Do NOT remove gap detection logic
  - Do NOT modify Stable TDEE (14-day) calculation
  - Do NOT reject data — flag as unreliable but continue tracking

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core algorithm modification, requires understanding of calculation flow and research standards
  - **Skills**: `[]`
    - Deep understanding of TDEE algorithms needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on Wave 1 analysis)
  - **Blocks**: Tasks 9, 10, 11
  - **Blocked By**: Tasks 2, 3 (need tests and analysis)

  **References**:
  - `js/calculator-tdee.js:289-379` - calculateFastTDEE function to modify
  - `js/calculator-tdee.js:237-260` - Calorie outlier detection pattern to follow
  - Task 2 tests - Specifications for water weight scenario
  - Hall & Chow (2011) - Energy balance model
  - Kreitzman et al. (1992) - Glycogen-water binding (1g glycogen : 3-4g water)

  **Acceptance Criteria**:
  - [ ] Weight change >1kg/week without calorie correlation flags as unreliable
  - [ ] Fast TDEE returns null, falls back to Stable TDEE (14-day)
  - [ ] Confidence reduced by 20 points
  - [ ] Task 2 water weight test PASSES
  - [ ] Existing tests still pass (no regressions)
  - [ ] Change saved to `.sisyphus/evidence/task-5-diff.txt`

  **QA Scenarios**:

  ```
  Scenario: Water weight detected and flagged
    Tool: Bash
    Preconditions: Task 2 tests exist, Task 5 implementation complete
    Steps:
      1. Run: node tests/node-test.js 2>&1 | grep "water weight"
      2. Verify "water weight scenario" test PASSES
      3. Verify no other tests FAILED
    Expected Result: Water weight test passes, no regressions
    Failure Indicators: Test still fails, other tests break
    Evidence: .sisyphus/evidence/task-5-test-output.txt
  ```

  **Commit**: YES
  - Message: `fix(tdee): add water weight detection per Hall & Chow (2011)`
  - Files: `js/calculator-tdee.js`
  - Pre-commit: `node tests/node-test.js`

- [x] 6. Validate Against Controlled Datasets

  **What to do**:
  Create validation script that runs all 5 scenarios and compares actual vs expected:
  
  ```
  Scenario          | Expected TDEE | Actual TDEE | Pass/Fail
  ------------------|---------------|-------------|----------
  Maintenance       | 2500 ±5%      | ???         | ???
  Cutting (0.5kg/w) | 2554 ±5%      | ???         | ???
  Bulking (0.5kg/w) | 2446 ±5%      | ???         | ???
  Water weight      | Flag unreliable | ???       | ???
  Gaps (14+ days)   | Within 10%    | ???         | ???
  ```
  
  Run validation and document results.

  **Must NOT do**:
  - Do NOT modify calculations to "pass" validation
  - Do NOT skip failing scenarios — document them
  - Do NOT proceed without evidence

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Script execution and comparison
  - **Skills**: `[]`
    - Basic scripting and data comparison

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on Wave 2 fixes)
  - **Blocks**: Tasks 9, 10, 11
  - **Blocked By**: Tasks 5, 7 (need fixes implemented)

  **References**:
  - Task 2 tests - Controlled datasets
  - Hall & Chow (2011) - Expected TDEE formula
  - Task 5, 7 implementations - Fixes to validate

  **Acceptance Criteria**:
  - [ ] Validation script runs all 5 scenarios
  - [ ] Results documented with pass/fail per scenario
  - [ ] Evidence saved to `.sisyphus/evidence/task-6-validation.txt`

  **QA Scenarios**:

  ```
  Scenario: Validation script executes and documents results
    Tool: Bash
    Preconditions: Tasks 5, 7 complete
    Steps:
      1. Run: node scripts/validate-tdee.js
      2. Verify output shows results for all 5 scenarios
      3. Verify at least 4/5 scenarios pass
    Expected Result: Validation report with pass/fail per scenario
    Failure Indicators: Script crashes, missing scenarios, <4/5 pass
    Evidence: .sisyphus/evidence/task-6-validation.txt
  ```

  **Commit**: YES
  - Message: `test(tdee): validate calculations against controlled datasets`
  - Files: `scripts/validate-tdee.js`
  - Pre-commit: `node scripts/validate-tdee.js`

- [x] 7. Enhance Confidence Scoring (Research-Backed)

  **What to do**:
  Implement confidence scoring based on nutritional epidemiology standards:
  
  **Scoring factors** (weights from research):
  1. **Tracking duration** (40% weight):
     - <7 days: -30 points
     - 7-13 days: -15 points
     - 14-27 days: -5 points
     - 28+ days: 0 points (optimal)
  
  2. **Data completeness** (25% weight):
     - <70% days logged: -25 points
     - 70-84% days logged: -10 points
     - ≥85% days logged: 0 points
  
  3. **Weight volatility** (20% weight):
     - CV >0.3 or >1kg/week swing: -20 points
     - CV 0.2-0.3: -10 points
     - CV <0.2: 0 points
  
  4. **Weekend coverage** (15% weight):
     - No weekend days: -15 points (systematic bias)
     - <50% weekends: -8 points
     - ≥50% weekends: 0 points
  
  **Confidence labels**:
  - 80-100: High confidence (trust for decision-making)
  - 60-79: Medium confidence (use with caution)
  - 40-59: Low confidence (preliminary estimate only)
  - <40: Very low confidence (insufficient data)

  **Must NOT do**:
  - Do NOT remove gap detection from confidence
  - Do NOT make confidence always low
  - Do NOT change confidence thresholds without tests
  - Do NOT add user-facing messages (focus on calculation only)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Confidence scoring affects multiple calculation paths, requires statistical understanding
  - **Skills**: `[]`
    - Understanding of statistical confidence metrics

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on Wave 1)
  - **Blocks**: Tasks 9, 10
  - **Blocked By**: Tasks 2, 4 (need test specs)

  **References**:
  - `js/calculator-tdee.js:580-650` - Current confidence calculation logic
  - Singh et al. (2025) - Minimum days for reliability
  - Hall & Chow (2011) - Confidence interval methodology
  - Nutritional epidemiology standards (reliability r≥0.8 for clinical use)

  **Acceptance Criteria**:
  - [ ] Confidence reflects all 4 factors (duration, completeness, volatility, weekends)
  - [ ] Water weight reduces confidence by 20 points
  - [ ] Gap scenario handled correctly (completeness factor)
  - [ ] Task 2 confidence test PASSES
  - [ ] Change saved to `.sisyphus/evidence/task-7-diff.txt`

  **QA Scenarios**:

  ```
  Scenario: Confidence scoring matches research standards
    Tool: Bash
    Preconditions: Task 7 implementation complete
    Steps:
      1. Run: node tests/node-test.js 2>&1 | grep "confidence"
      2. Verify confidence test PASSES
      3. Verify confidence scores match expected values for each scenario
    Expected Result: Confidence scoring matches research standards
    Failure Indicators: Test fails, scores don't match expected ranges
    Evidence: .sisyphus/evidence/task-7-test-output.txt
  ```

  **Commit**: YES (groups with 5)
  - Message: `fix(tdee): enhance confidence scoring per research standards`
  - Files: `js/calculator-tdee.js`
  - Pre-commit: `node tests/node-test.js`

- [ ] 8. Remove Deprecated Task (Merged into Task 7)

  **What to do**:
  - Skip this task — data quality metrics integrated into Task 7 confidence scoring
  - No separate implementation needed

  **Note**: Original Task 8 (data quality metrics) was merged into Task 7 (confidence scoring) to avoid duplication.

  **Commit**: NO

- [ ] 8. Add Data Quality Metrics

  **What to do**:
  - Calculate coefficient of variation for weight deltas
  - Track gap frequency (gaps / total days)
  - Expose metrics via Calculator.get DataQualityMetrics()
  - Use metrics in confidence scoring (Task 7)

  **Must NOT do**:
  - Do NOT expose metrics in UI (internal only for now)
  - Do NOT break existing confidence API
  - Do NOT add metrics without tests

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: New metric calculation, affects confidence system
  - **Skills**: `[]`
    - Statistical analysis knowledge

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on Wave 1)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 2, 4

  **References**:
  - `js/calculator-tdee.js:516-560` - Linear regression (statistical pattern)
  - `js/calculator.js:230-280` - Statistical functions (mean, std dev, CV)
  - Task 4 specs - Data quality requirements

  **Acceptance Criteria**:
  - [ ] Data quality metrics calculated correctly
  - [ ] Metrics exposed via public API
  - [ ] Metrics used in confidence scoring
  - [ ] Change saved to `.sisyphus/evidence/task-8-diff.txt`

  **QA Scenarios**:

  ```
  Scenario: Data quality metrics calculated
    Tool: Bash
    Preconditions: Task 8 implementation complete
    Steps:
      1. Call Calculator.getDataQualityMetrics(entries)
      2. Verify returns object with cv, gapFrequency, outlierCount
      3. Verify values are reasonable (cv between 0-1, gapFrequency 0-1)
    Expected Result: Metrics object with valid values
    Failure Indicators: Missing fields, invalid ranges
    Evidence: .sisyphus/evidence/task-8-test-output.txt
  ```

  **Commit**: YES (groups with 5, 6, 7)
  - Message: `feat(tdee): add data quality metrics`
  - Files: `js/calculator-tdee.js`
  - Pre-commit: `node tests/node-test.js`

- [x] 9. Run Full Test Suite, Fix Regressions

  **What to do**:
  - Run `node tests/node-test.js`
  - Fix any failing tests (regressions from Tasks 5-8)
  - Verify all 80+ tests pass
  - Document any fixes in task comments

  **Must NOT do**:
  - Do NOT skip failing tests
  - Do NOT modify tests to "pass" without fixing code
  - Do NOT proceed with failures

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Test execution, bug fixing
  - **Skills**: `[]`
    - Test debugging skills

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on all Wave 2 tasks)
  - **Blocks**: Tasks 10, 11, 12, F1-F4
  - **Blocked By**: Tasks 5, 6, 7 (validation complete)

  **References**:
  - `tests/node-test.js` - Test runner
  - `tests/calculator.test.js` - Calculator tests
  - Tasks 5-8 implementations - Changes to verify

  **Acceptance Criteria**:
  - [ ] All tests pass: `node tests/node-test.js` exits with 0
  - [ ] No skipped tests
  - [ ] Test output saved to `.sisyphus/evidence/task-9-test-results.txt`

  **QA Scenarios**:

  ```
  Scenario: All tests pass
    Tool: Bash
    Preconditions: Tasks 5-8 complete
    Steps:
      1. Run: node tests/node-test.js
      2. Verify exit code is 0
      3. Verify output shows "80+ tests, 0 failures"
    Expected Result: All tests pass
    Failure Indicators: Any test failures, exit code != 0
    Evidence: .sisyphus/evidence/task-9-test-results.txt
  ```

  **Commit**: YES
  - Message: `test(tdee): fix regressions from calculation fixes`
  - Files: Multiple (as needed)
  - Pre-commit: `node tests/node-test.js`

- [ ] 10. Browser QA with User's Data

  **What to do**:
  - Import sample_data_export.json into browser
  - Navigate to dashboard
  - Verify 7-day TDEE shows realistic value (not 787)
  - Verify 14-day TDEE shows ~2590 (unchanged)
  - Verify confidence badge reflects data quality
  - Take screenshots of results

  **Must NOT do**:
  - Do NOT modify data manually
  - Do NOT skip screenshot evidence
  - Do NOT proceed if values still wrong

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Browser-based UI verification, visual validation
  - **Skills**: `playwright`
    - Browser automation for UI testing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on Wave 2 fixes)
  - **Blocks**: Task 11, F1-F4
  - **Blocked By**: Tasks 5, 6, 7, 9

  **References**:
  - `sample_data_export.json` - Test data to import
  - `index.html` - Main app page
  - Task 4 specs - Expected values to verify

  **Acceptance Criteria**:
  - [ ] 7-day TDEE shows realistic value (>1200, <4000)
  - [ ] 14-day TDEE shows ~2590 (within 5%)
  - [ ] Confidence badge shows appropriate level
  - [ ] Screenshots saved to `.sisyphus/evidence/task-10-*.png`

  **QA Scenarios**:

  ```
  Scenario: Dashboard shows correct TDEE values
    Tool: Playwright
    Preconditions: App served locally, sample data imported
    Steps:
      1. Navigate to index.html
      2. Import sample_data_export.json
      3. Wait for dashboard to render
      4. Extract 7-day TDEE text content
      5. Verify 7-day TDEE is between 1200-4000
      6. Extract 14-day TDEE text content
      7. Verify 14-day TDEE is between 2400-2800
    Expected Result: Both TDEE values in expected ranges
    Failure Indicators: 7-day TDEE < 1200 or > 4000, 14-day outside range
    Evidence: .sisyphus/evidence/task-10-dashboard.png
  ```

  **Commit**: NO (QA only)

- [ ] 11. Verify Excel Parity

  **What to do**:
  - Run existing Excel parity tests
  - Verify fixes don't break Excel calculation match
  - Update Excel test if needed (with user confirmation)
  - Document any deviations

  **Must NOT do**:
  - Do NOT change Excel test without confirmation
  - Do NOT ignore Excel parity failures
  - Do NOT proceed with mismatches

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Test verification, comparison
  - **Skills**: `[]`
    - Test validation

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on Wave 2)
  - **Blocks**: Task 12, F1-F4
  - **Blocked By**: Tasks 9, 10

  **References**:
  - `tests/calculator.test.js:1200-1300` - Excel parity tests
  - `Improved_TDEE_Tracker.xlsx` - Reference spreadsheet

  **Acceptance Criteria**:
  - [ ] Excel parity tests pass
  - [ ] Any deviations documented
  - [ ] Evidence saved to `.sisyphus/evidence/task-11-excel-parity.txt`

  **QA Scenarios**:

  ```
  Scenario: Excel parity maintained
    Tool: Bash
    Preconditions: Tasks 9, 10 complete
    Steps:
      1. Run: node tests/node-test.js 2>&1 | grep -i "excel"
      2. Verify Excel parity tests PASS
      3. Verify no mismatches reported
    Expected Result: Excel parity tests pass
    Failure Indicators: Excel test failures, value mismatches
    Evidence: .sisyphus/evidence/task-11-excel-parity.txt
  ```

  **Commit**: NO (verification only)

- [ ] 12. Documentation Update

  **What to do**:
  - Update AGENTS.md with water weight handling
  - Document new confidence scoring factors
  - Add troubleshooting entry for "impossible TDEE values"
  - Update sync-challenges.md if relevant

  **Must NOT do**:
  - Do NOT add unrelated documentation
  - Do NOT skip critical changes
  - Do NOT modify code in this task

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Technical documentation, guidelines update
  - **Skills**: `[]`
    - Technical writing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task before verification)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 11

  **References**:
  - `AGENTS.md` - Main documentation
  - `.opencode/context/project/sync-challenges.md` - Challenges doc
  - Tasks 5-8 implementations - Features to document

  **Acceptance Criteria**:
  - [ ] AGENTS.md updated with water weight section
  - [ ] Confidence scoring documented
  - [ ] Troubleshooting guide updated
  - [ ] Documentation saved to `.sisyphus/evidence/task-12-docs-diff.txt`

  **QA Scenarios**:

  ```
  Scenario: Documentation is complete
    Tool: Bash
    Preconditions: Tasks 5-11 complete
    Steps:
      1. Read AGENTS.md
      2. Search for "water weight" or "outlier"
      3. Verify documentation exists and is accurate
    Expected Result: Documentation covers water weight handling
    Failure Indicators: Missing docs, inaccurate information
    Evidence: .sisyphus/evidence/task-12-docs-diff.txt
  ```

  **Commit**: YES
  - Message: `docs: update AGENTS.md with water weight handling`
  - Files: `AGENTS.md`, `.opencode/context/project/sync-challenges.md`
  - Pre-commit: None (docs only)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1-4**: `debug(tdee): add validation infrastructure and research-backed test scenarios` — validate-tdee.js, 5 test scenarios, analysis docs
- **5**: `fix(tdee): add water weight detection per Hall & Chow (2011)` — calculator-tdee.js changes
- **6**: `test(tdee): validate calculations against controlled datasets` — validation script execution
- **7**: `fix(tdee): enhance confidence scoring per research standards` — 4-factor confidence model
- **9**: `test(tdee): fix regressions from enhancements` — test fixes
- **12**: `docs: update AGENTS.md with research citations` — documentation updates

---

## Success Criteria

### Verification Commands
```bash
node tests/node-test.js              # Expected: All tests pass (including 5 new scenarios)
node scripts/validate-tdee.js        # Expected: 5/5 scenarios validated
```

### Final Checklist
- [ ] All 5 research-backed scenarios pass (maintenance, cutting, bulking, water weight, gaps)
- [ ] Water weight detection working (>1kg/week flags as unreliable)
- [ ] Confidence scoring enhanced (4 factors: duration, completeness, volatility, weekends)
- [ ] All existing tests pass (no regressions)
- [ ] Validation script confirms calculations match Hall & Chow formula
- [ ] Documentation updated with research citations
