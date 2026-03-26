# 2026-03-26 Release Notes

## Summary
- Added a trust-first presentation layer across the analysis experience.
- Normalized mixed raw scores onto a 100-point display while preserving original raw scores.
- Added richer market context on the main analysis page, including WTI oil and DXY.

## What changed

### Data trust and readability
- Added shared `scoreDisplay`, `reliability`, and `universeMeta` metadata.
- Surfaced stronger freshness / stale / fallback messaging in the UI.
- Reorganized the main analysis view so trust cues appear before detailed conclusions.

### Score presentation
- Display scores now use a 100-point normalized view for easier comparison.
- Original raw score scales remain visible to preserve interpretation context.

### Market context
- Added WTI Oil and DXY to market overview data.
- Added a market signal dashboard on the main analysis page to summarize VIX, oil, dollar, and rate conditions.

### Documentation and build hygiene
- Updated API docs and product README to match the new metadata model.
- Set `outputFileTracingRoot` to stop Next.js from guessing the wrong workspace root during builds.

## Verification
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run typecheck`
