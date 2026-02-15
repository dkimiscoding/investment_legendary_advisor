# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build (use to verify changes compile)
npm run lint         # ESLint check
npm run start        # Start production server
```

No test framework is configured. Verify changes by running `npm run build`.

## Deployment

Deployed on Vercel. Production deploy:
```bash
vercel deploy --prod
```
Production URL: https://investment-advisor-one.vercel.app

## Architecture Overview

Next.js 15 App Router application that analyzes US stocks using a **3-screener scoring system** (Chart + Valuation + Sentiment). The only external data dependency is `yahoo-finance2`.

### Scoring Pipeline

```
Yahoo Finance Data → Individual Screeners → Combined Screener → Verdict + Action Guide
```

**Three core screeners produce a 0-70 total score:**
- **Chart Screener** (0-25): MA crossover, deviation from MA200, RSI, W/M patterns, market breadth
- **Valuation Screener** (0-20): PE vs market, fair price estimate, PEG, market PE level
- **Sentiment Screener** (0-25): VIX, Put/Call ratio, AAII sentiment, margin debt, HY spread

**Key design principle — contrarian scoring:** Higher score = more market fear = better buy opportunity. This inverts typical sentiment interpretation.

**Score → Verdict thresholds** (defined in `combined-screener.ts`):
- ≥53: Very Bullish (extreme fear) → 42-52: Bullish → 28-41: Neutral → 18-27: Bearish → <18: Very Bearish (extreme euphoria)

**Optional supplementary screeners:**
- **Dividend Screener** (+0-20): Yield, safety, growth, consecutive increase streak
- **Masters Screener**: 8 legendary investor strategy evaluations (Buffett, Graham, Lynch, etc.)
- **ETF Screener** (0-70): Chart + Efficiency + Momentum (separate scoring for ETFs)

### Data Flow

**Single ticker** (`/api/screener/combined/[ticker]`): Parallel fetch of chart/financial/sentiment/dividend/masters data → score each → combine → return JSON.

**Daily screening** (`/api/screening/daily`): Batch-processes ~55 stocks from `stock-universe.ts` in groups of 3 with 2s delays (Yahoo Finance rate limiting). Caches for 4 hours. Categorizes into: Fear Buys, Undervalued, Dividend Attractive, Momentum Leaders, Sector Rotation.

**ETF screening** (`/api/screening/etf`): Similar batch pipeline for ~50 ETFs from `etf-universe.ts`.

### Key Directories

```
src/
├── app/                    # Pages + API routes
│   ├── page.tsx            # Main stock analysis (single/multi ticker)
│   ├── discover/page.tsx   # Daily screening recommendations
│   ├── etf/page.tsx        # ETF recommendations
│   └── api/
│       ├── screener/       # Per-ticker analysis endpoints
│       └── screening/      # Batch screening endpoints (daily, etf, sector)
├── lib/
│   ├── screeners/          # All scoring logic (chart, valuation, sentiment, dividend, masters, combined, etf, auto)
│   ├── data/               # Data fetching (yahoo-finance.ts, sentiment-data.ts) + stock/ETF universe lists
│   ├── cache.ts            # In-memory cache with TTL presets
│   ├── validate-ticker.ts  # Input sanitization (regex: /^[A-Za-z0-9.\-^]{1,10}$/)
│   └── middleware.ts       # Rate limiting (30 req/min per IP)
└── types/index.ts          # All TypeScript interfaces
```

### Caching

In-memory cache (`cache.ts`) with preset TTLs:
- **5 min**: VIX, quotes, market overview (REALTIME)
- **15 min**: Chart data, market breadth (CHART)
- **1 hour**: Financial data, sentiment, dividends (FINANCIAL/SENTIMENT)
- **4 hours**: Daily screening report
- **7 days**: Margin debt (WEEKLY, quarterly data from FRED)

Cache key convention: `chart:{ticker}`, `market:vix`, `screening:daily`, etc. Cache resets on deploy (process-bound).

### Frontend

All three pages (`page.tsx`, `discover/page.tsx`, `etf/page.tsx`) are self-contained `'use client'` components with no shared component library. UI text is hardcoded in Korean — no i18n system. Styled with Tailwind CSS.

Scoring display uses `{score}/{max}점` format with color-coded interpretation. Verdicts include action-oriented Korean labels.

### Security

- Rate limiting middleware: 30 requests/min per IP sliding window
- Ticker validation: regex whitelist + uppercase sanitization
- Security headers in `next.config.mjs`: nosniff, DENY framing, XSS protection, strict referrer

### Important Conventions

- All UI text is in Korean. Respond in Korean when the user writes in Korean.
- Score maximums vary by screener (25/20/25 for core, 20 for dividend, 70 total). These are hardcoded throughout — changing a max requires updating both screener logic and UI.
- Sentiment screener data sources have fallback values. Each indicator tracks whether it's `'live'` or `'fallback'`.
- The `stock-universe.ts` and `etf-universe.ts` files define which tickers are analyzed in batch screening.
- Path alias: `@/*` maps to `./src/*`.
