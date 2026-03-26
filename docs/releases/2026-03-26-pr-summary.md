# 2026-03-26 PR Summary

## Summary
- Add a trust-first presentation layer for stock and screening analysis.
- Normalize mixed raw score scales onto a 100-point display while preserving raw score context.
- Add richer market context on the main page with VIX, WTI Oil, DXY, and 10Y signal cards.
- Fix production single-ticker failures by falling back from Yahoo `historical()` to `chart()` when historical data is partially null.

## Key Changes
- Introduced shared `scoreDisplay`, `reliability`, and `universeMeta` response metadata.
- Upgraded `SnapshotStatusBanner` to surface trust and freshness more clearly.
- Updated `/`, `/discover`, `/etf`, and `/legends` to emphasize normalized scores and trust signals.
- Added production QA and release-note artifacts.
- Configured `outputFileTracingRoot` to remove noisy Next.js workspace-root warnings during builds.

## Test Plan
- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run typecheck`
- [x] Preview deploy smoke check
- [x] Production deploy smoke check
