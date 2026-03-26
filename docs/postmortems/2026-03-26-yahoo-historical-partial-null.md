# 2026-03-26 Postmortem: Yahoo historical partial-null production failure

## Incident Summary
Production single-ticker analysis requests such as `/api/screener/combined/AAPL` returned HTTP 500 after deployment, while other routes and screening endpoints continued to work.

## User Impact
- Home page loaded successfully.
- Screening pages loaded successfully.
- Clicking a quick ticker such as `AAPL` on the home page showed an analysis failure instead of a result.

## Detection
The issue was caught during production smoke QA immediately after deployment.

Evidence:
- Browser console showed a 500 on `/api/screener/combined/AAPL`
- Direct API response returned:
  - `Historical returned a result with SOME (but not all) null values...`

## Root Cause
`fetchChartData()` depended on `yahoo-finance2`'s `historical()` response being fully valid. In production, Yahoo returned a partially null historical payload for at least one ticker, which caused the route to throw before analysis could complete.

## Why It Escaped Earlier Checks
- Local tests and build passed because they did not exercise a live Yahoo response with partial-null historical data.
- Preview/production smoke QA initially focused on route health and UI rendering before a real ticker analysis was attempted.

## Fix
- Added a failing test for the chart-data fetch path.
- Updated `fetchChartData()` so that when `historical()` throws or returns invalid rows, it falls back to `chart()` data.
- Preserved the existing historical path as the primary source when healthy.

## Verification
- Added regression tests covering:
  - thrown historical error -> chart fallback
  - invalid/null historical rows -> chart fallback
- Re-ran:
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
- Re-deployed production.
- Confirmed `/api/screener/combined/AAPL` returned 200 with full analysis JSON.
- Confirmed browser smoke QA on production rendered the AAPL result instead of an error.

## Follow-ups
- Keep production smoke QA including at least one real single-ticker analysis request.
- Keep the chart fallback as a permanent resilience mechanism for Yahoo provider anomalies.
- Consider adding a small live-provider health checklist before future production announcements.
