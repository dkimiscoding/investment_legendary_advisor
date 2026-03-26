# Trustworthy & Readable Screening Experience Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a shared reliability/score presentation layer so the app can show stronger trust signals, 100-point-normalized scores, and clearer universe/ranking context across the main analysis and screening views.

**Architecture:** Keep existing scoring formulas intact and layer new presentation metadata on top. Add shared helpers for normalized score display, reliability summaries, and universe metadata; then thread them through the API responses and UI in stages, starting with the main stock analysis page and expanding to screening pages.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5, Node test runner, existing snapshot helpers, existing screening/domain libs.

---

## Pre-flight context for the implementer

- Work in a **dedicated worktree or branch** before editing app code.
- The current repository already contains unrelated local modifications in UI files; do **not** revert or overwrite them.
- Existing verification baseline before implementation:
  - `npm run typecheck` passes
  - `npm test` passes
  - `npm run build` passes
  - `npm run lint` reports one warning in `src/app/page.tsx`

---

### Task 1: Add shared score-display helpers with tests

**Files:**
- Create: `src/lib/score-display.ts`
- Create: `tests/presentation/score-display.test.ts`
- Reference: `src/types/index.ts`

**Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { toNormalizedScore } from '../../src/lib/score-display';

test('toNormalizedScore converts raw scores to a 100-point basis', () => {
  assert.deepEqual(toNormalizedScore(55, 70), {
    normalizedScore: 79,
    rawScore: 55,
    rawMaxScore: 70,
    displayText: '79/100',
    rawDisplayText: '55/70',
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="toNormalizedScore converts raw scores to a 100-point basis"`

Expected: FAIL because `src/lib/score-display.ts` does not exist yet.

**Step 3: Write minimal implementation**

```ts
export interface ScoreDisplay {
  normalizedScore: number;
  rawScore: number;
  rawMaxScore: number;
  displayText: string;
  rawDisplayText: string;
}

export function toNormalizedScore(rawScore: number, rawMaxScore: number): ScoreDisplay {
  const normalizedScore = rawMaxScore <= 0 ? 0 : Math.round((rawScore / rawMaxScore) * 100);
  return {
    normalizedScore,
    rawScore,
    rawMaxScore,
    displayText: `${normalizedScore}/100`,
    rawDisplayText: `${rawScore}/${rawMaxScore}`,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --test-name-pattern="toNormalizedScore converts raw scores to a 100-point basis"`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/score-display.ts tests/presentation/score-display.test.ts
git commit -m "Introduce a shared 100-point score display layer

Add a small presentation helper so UI and API surfaces can normalize mixed raw score scales without changing the underlying scoring formulas.

Constraint: Existing score engines must remain behaviorally unchanged
Rejected: Recompute all domain scores on a 100-point scale | larger migration risk with no user benefit
Confidence: high
Scope-risk: narrow
Directive: Keep display-only normalization separate from domain scoring logic
Tested: score-display unit test
Not-tested: UI wiring"
```

---

### Task 2: Add shared reliability-summary helpers with tests

**Files:**
- Create: `src/lib/reliability.ts`
- Create: `tests/presentation/reliability.test.ts`
- Reference: `src/lib/snapshots.ts`
- Reference: `src/lib/snapshot-display.ts`

**Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReliabilitySummary } from '../../src/lib/reliability';

test('buildReliabilitySummary marks fallback snapshots as caution', () => {
  const summary = buildReliabilitySummary({
    freshness: 'fallback',
    partialFailure: true,
    generatedAt: '2026-03-26T00:00:00.000Z',
    sourceUpdatedAt: '2026-03-26T00:00:00.000Z',
    errorSummary: 'sentiment timeout',
  }, ['AAII', 'Put/Call']);

  assert.equal(summary.level, 'caution');
  assert.equal(summary.fallbackMetrics.length, 2);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="buildReliabilitySummary marks fallback snapshots as caution"`

Expected: FAIL because the helper does not exist yet.

**Step 3: Write minimal implementation**

```ts
import type { SnapshotMeta } from './snapshots';

export interface ReliabilitySummary {
  level: 'high' | 'medium' | 'caution';
  freshness: SnapshotMeta['freshness'];
  fallbackMetrics: string[];
  message: string;
  generatedAt: string;
  sourceUpdatedAt: string;
}

export function buildReliabilitySummary(
  meta: SnapshotMeta,
  fallbackMetrics: string[] = [],
): ReliabilitySummary {
  const level = meta.freshness === 'fresh' && !meta.partialFailure
    ? 'high'
    : meta.freshness === 'fallback' || meta.partialFailure
    ? 'caution'
    : 'medium';

  return {
    level,
    freshness: meta.freshness,
    fallbackMetrics,
    message: meta.errorSummary ?? '데이터 상태를 확인하세요.',
    generatedAt: meta.generatedAt,
    sourceUpdatedAt: meta.sourceUpdatedAt,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --test-name-pattern="buildReliabilitySummary marks fallback snapshots as caution"`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/reliability.ts tests/presentation/reliability.test.ts
git commit -m "Expose a shared reliability summary for snapshot-backed views

Create a display-oriented helper that maps freshness and fallback metadata to a small, reusable trust model for UI surfaces.

Constraint: Fallback responses must still be renderable results
Rejected: Lower result scores when freshness degrades | product decision is to preserve scores and show stronger warnings
Confidence: high
Scope-risk: narrow
Directive: Reliability level must reflect data status, not alter the underlying score
Tested: reliability unit test
Not-tested: page integration"
```

---

### Task 3: Add universe metadata helpers and expand daily-screening coverage

**Files:**
- Modify: `src/lib/data/stock-universe.ts`
- Modify: `src/lib/screeners/auto-screener.ts`
- Modify: `src/types/index.ts`
- Create: `tests/screeners/universe-meta.test.ts`

**Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { getScreeningUniverseMeta } from '../../src/lib/data/stock-universe';

test('getScreeningUniverseMeta describes the blended stock universe', () => {
  const meta = getScreeningUniverseMeta();
  assert.equal(meta.label, 'S&P500 Top 100 + Dow 30 + Nasdaq Top 50');
  assert.ok(meta.totalCandidates >= 100);
  assert.equal(meta.rankingBasis, 'latest-analysis-score');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="getScreeningUniverseMeta describes the blended stock universe"`

Expected: FAIL because metadata helper is missing.

**Step 3: Write minimal implementation**

Add a typed helper in `src/lib/data/stock-universe.ts` similar to:

```ts
export interface ScreeningUniverseMeta {
  label: string;
  totalCandidates: number;
  rankingBasis: 'latest-analysis-score';
  segments: string[];
}

export function getScreeningUniverseMeta(): ScreeningUniverseMeta {
  return {
    label: 'S&P500 Top 100 + Dow 30 + Nasdaq Top 50',
    totalCandidates: getAllTickers().length,
    rankingBasis: 'latest-analysis-score',
    segments: ['sp500Top100', 'dowJones30', 'nasdaqTop50'],
  };
}
```

Then thread `universeMeta` into the `DailyScreeningReport` shape built by `runDailyScreening()`.

**Step 4: Run targeted tests**

Run: `npm test -- --test-name-pattern="getScreeningUniverseMeta describes the blended stock universe"`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/data/stock-universe.ts src/lib/screeners/auto-screener.ts src/types/index.ts tests/screeners/universe-meta.test.ts
git commit -m "Explain which stock universe powers screening rankings

Attach explicit universe metadata so users can see which broad market set the screening results come from and how those results are ordered.

Constraint: Existing screening inputs remain partially static in this phase
Rejected: Swap immediately to live external constituent feeds | too much risk for a trust-focused first pass
Confidence: medium
Scope-risk: moderate
Directive: Keep universe labels and segment names consistent across API and UI
Tested: universe metadata unit test
Not-tested: live constituent freshness"
```

---

### Task 4: Thread scoreDisplay / reliability / universeMeta through API responses

**Files:**
- Modify: `src/app/api/screener/combined/[ticker]/route.ts`
- Modify: `src/app/api/screening/daily/route.ts`
- Modify: `src/app/api/screening/etf/route.ts`
- Modify: `src/app/api/screening/legends/route.ts`
- Modify: `src/types/index.ts`
- Reference: `src/lib/score-display.ts`
- Reference: `src/lib/reliability.ts`
- Reference: `src/lib/snapshot-display.ts`

**Step 1: Write the failing tests**

Add assertions to route-adjacent tests or new presentation tests that verify response-shape builders include:
- `scoreDisplay`
- `reliability`
- `universeMeta` (for screening responses)

Example:

```ts
assert.equal(response.scoreDisplay.normalizedScore, 79);
assert.equal(response.reliability.level, 'medium');
assert.equal(response.universeMeta.label, 'S&P500 Top 100 + Dow 30 + Nasdaq Top 50');
```

**Step 2: Run targeted tests to verify failure**

Run: `npm test`

Expected: FAIL because response objects do not include the new fields yet.

**Step 3: Implement the minimal response wiring**

- In the combined-ticker route, attach a display object for the total score and each major sub-score.
- In daily/ETF/legends routes, attach `reliability` built from `snapshotMeta` and any fallback metric labels already available.
- Attach `universeMeta` to daily/legends responses that depend on stock screening.
- Keep current raw fields for backward compatibility during rollout.

**Step 4: Run tests to verify pass**

Run: `npm test`

Expected: PASS for the new response-shape assertions.

**Step 5: Commit**

```bash
git add src/app/api/screener/combined/[ticker]/route.ts src/app/api/screening/daily/route.ts src/app/api/screening/etf/route.ts src/app/api/screening/legends/route.ts src/types/index.ts tests

git commit -m "Make trust and score-display metadata first-class API output

Attach presentation-ready metadata to the existing API responses so clients can render stronger trust cues and normalized scores without duplicating business rules.

Constraint: Existing clients may still rely on raw score fields
Rejected: Replace raw fields immediately with display-only fields | avoid breaking in-flight UI work
Confidence: medium
Scope-risk: moderate
Directive: Additive response changes only until all clients are migrated
Tested: node test suite
Not-tested: browser rendering"
```

---

### Task 5: Redesign the main stock-analysis page around trust-first reading order

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/SnapshotStatusBanner.tsx`
- Modify: `src/lib/snapshot-display.ts`
- Modify: `src/types/index.ts`
- Reference: `src/lib/score-display.ts`
- Reference: `src/lib/reliability.ts`

**Step 1: Write the failing test or snapshot-oriented assertion**

If there is no React rendering harness yet, start with pure helper tests for the display model and then manually verify the page. At minimum, add assertions for banner copy and display helpers.

Example helper assertion:

```ts
assert.match(display.description, /이전 성공 결과/);
```

**Step 2: Run the targeted test**

Run: `npm test -- --test-name-pattern="snapshot display"`

Expected: FAIL if new copy paths are not implemented yet.

**Step 3: Implement the minimal UI restructure**

Reorder `/` to show:
1. reliability summary bar
2. final verdict + `NN/100` + raw score
3. top reasons / key evidence
4. expandable or clearly separated detailed sections

Update `SnapshotStatusBanner` to support stronger language, affected metric labels, and optional universe/ranking context when available.

**Step 4: Verify**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm test`

Expected: all pass, except the pre-existing lint warning unless removed as part of this task.

**Step 5: Commit**

```bash
git add src/app/page.tsx src/components/SnapshotStatusBanner.tsx src/lib/snapshot-display.ts src/types/index.ts
git commit -m "Put trust signals ahead of stock-analysis conclusions

Restructure the main analysis page so users see data freshness, fallback warnings, and normalized total scores before reading the deeper metrics.

Constraint: Existing dense information should remain accessible
Rejected: Hide detailed metrics behind a separate page | conflicts with the product goal of dense but readable information
Confidence: medium
Scope-risk: moderate
Directive: Preserve the conclusion -> reasons -> details reading order on future UI edits
Tested: lint, typecheck, node tests
Not-tested: visual polish across all viewport sizes"
```

---

### Task 6: Apply the same trust-first presentation model to `/discover`, `/etf`, and `/legends`

**Files:**
- Modify: `src/app/discover/page.tsx`
- Modify: `src/app/etf/page.tsx`
- Modify: `src/app/legends/page.tsx`
- Modify: `src/components/SnapshotStatusBanner.tsx`
- Modify: `src/types/index.ts`

**Step 1: Write the failing test or helper assertions**

Add or extend helper-level tests for:
- normalized card scores
- reliability labels
- universe metadata rendering strings

**Step 2: Run the tests to verify failure**

Run: `npm test`

Expected: FAIL because those views still render raw, mixed-scale scores and minimal trust metadata.

**Step 3: Implement the minimal UI changes**

- Show normalized scores on cards and lists.
- Keep raw scores as secondary text.
- Show stronger snapshot/reliability messaging at the page top.
- Add universe/ranking context on `/discover` and `/legends`.
- Preserve information density, but clarify hierarchy and labels.

**Step 4: Verify**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Expected: all pass; note and fix any new warnings introduced by the refactor.

**Step 5: Commit**

```bash
git add src/app/discover/page.tsx src/app/etf/page.tsx src/app/legends/page.tsx src/components/SnapshotStatusBanner.tsx src/types/index.ts
git commit -m "Make screening pages easier to trust and compare

Bring the trust-first banner, 100-point normalization, and clearer ranking context to screening and legends views so dense information remains readable without hiding detail.

Constraint: Current page-specific layouts should be evolved, not replaced wholesale
Rejected: Build an entirely new design system first | unnecessary delay before trust improvements land
Confidence: medium
Scope-risk: moderate
Directive: Keep normalized scores and raw scores visibly paired until the old scale disappears from user language
Tested: lint, typecheck, node tests, production build
Not-tested: manual browser QA"
```

---

### Task 7: Final regression sweep and docs refresh

**Files:**
- Modify: `README.md`
- Modify: `docs/API.md`
- Reference: `tests/README.md`

**Step 1: Add/update docs tests or assertions if needed**

If no doc tests exist, prepare doc updates after the code is green.

**Step 2: Run final verification before editing docs**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Expected: all pass.

**Step 3: Update docs minimally**

Document:
- the trust/reliability metadata
- normalized score presentation
- universe/ranking metadata

**Step 4: Re-run at least typecheck/tests if docs touched types/examples**

Run:
- `npm run typecheck`
- `npm test`

Expected: PASS.

**Step 5: Commit**

```bash
git add README.md docs/API.md
git commit -m "Document how trust metadata and normalized scores work

Refresh public docs so the product behavior matches the new trust-first UI and API output.

Constraint: Docs should describe current shipped behavior only
Rejected: Leave docs until later | would widen the trust gap between UI and documentation
Confidence: high
Scope-risk: narrow
Directive: Keep API docs additive while old raw fields still exist
Tested: typecheck, node tests
Not-tested: docs-only link validation"
```

---

## Full verification checklist

Run these before declaring the work complete:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Also manually confirm:
- main page shows trust banner first
- major scores display as `NN/100` with raw score secondary
- `/discover` and `/legends` expose universe/ranking context
- fallback/stale responses show stronger warning copy without hiding results
- no unrelated user changes were reverted
