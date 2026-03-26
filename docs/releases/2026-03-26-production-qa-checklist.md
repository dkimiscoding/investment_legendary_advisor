# 2026-03-26 Production QA Checklist

## Core smoke checks
- [ ] Home `/` loads without error
- [ ] Search for `AAPL` returns a result card
- [ ] Trust/reliability banner appears above the analysis summary when fallback or stale data is present
- [ ] Total score is shown as `NN/100` with raw score context nearby
- [ ] Main page shows market signal cards including VIX, 10Y, WTI Oil, and DXY when available

## Screening pages
- [ ] `/discover` loads and shows snapshot/trust metadata
- [ ] `/discover` cards show normalized score emphasis and raw-score context
- [ ] `/etf` loads and top ETF card/list renders correctly
- [ ] `/legends` loads and shows snapshot/trust metadata

## API spot checks
- [ ] `/api/screener/combined/AAPL` returns `scoreDisplay`
- [ ] `/api/screening/daily` returns `reliability` and `universeMeta`
- [ ] `/api/screening/legends` returns `reliability` and `universeMeta`

## Build/deploy sanity
- [ ] No Next.js workspace-root warning appears during build logs
- [ ] Production homepage responds successfully
- [ ] Key routes (`/`, `/discover`, `/etf`, `/legends`) return 200
