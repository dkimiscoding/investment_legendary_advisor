# API 문서

## 개요

이 프로젝트는 개별 판독기 API와 스크리닝/추천 API를 함께 제공합니다.

## 판독기 API

### GET `/api/screener/chart/:ticker`
차트 판독기
- 이동평균선(50/200일)
- 이격도
- RSI
- 패턴 분석

### GET `/api/screener/valuation/:ticker`
주가 판독기
- 적정주가
- PER
- PEG
- 시장 PER 비교

### GET `/api/screener/sentiment`
시장 심리 판독기
- VIX
- Put/Call Ratio
- AAII
- Margin Debt
- High Yield Spread

### GET `/api/screener/combined/:ticker`
통합 판독기
- 차트 + 밸류에이션 + 시장 심리 종합 분석
- 현재 기준 **기본 총점 0~70점**
  - 차트 25점
  - 밸류에이션 20점
  - 심리 25점
- 선택적으로 배당/투자 대가 해석이 함께 포함될 수 있음
- 응답은 `scoreDisplay`를 포함할 수 있으며, 이는 100점 환산 표시와 원점수 병기를 위한 메타데이터입니다

## 스크리닝 API

### GET `/api/screening/daily`
일일 추천 종목 스크리닝 리포트
- 카테고리별 추천 종목
- 전체 결과 랭킹
- 시장 요약

### GET `/api/screening/etf`
ETF 스크리닝 리포트
- top picks
- momentum leaders
- value opportunity
- sector best

### GET `/api/screening/legends`
투자 레전드 추천 리포트
- 레전드별 추천 종목
- 레전드별 시장 해석
- 컨센서스 종목

## 통합 점수 체계

기본 Combined Score는 **0~70점**입니다.

- **53~70**: `very_bullish`
- **42~52**: `bullish`
- **28~41**: `neutral`
- **18~27**: `bearish`
- **0~17**: `very_bearish`

점수가 높을수록 “공포/저평가/매수 기회” 성격이 강해지도록 설계되어 있습니다.

## 핵심 공식

```text
적정주가 = 예상 EPS × 적정 PER
적정 PER = EPS 성장률(%) 기반 범위 추정
PEG = PER / EPS 성장률
이격도 = (현재가 - 기준 이동평균선) / 기준 이동평균선 × 100
```


## Snapshot 메타데이터

주요 스크리닝 응답(`/api/screening/daily`, `/api/screening/etf`, `/api/screening/legends`)은 `snapshotMeta`를 포함할 수 있습니다.

또한 화면 신뢰도/정렬 정보를 위해 아래 메타데이터를 함께 포함할 수 있습니다.

- `reliability`
  - `level: high | medium | caution`
  - `freshness`
  - `fallbackMetrics`
  - `generatedAt`
  - `sourceUpdatedAt`
- `universeMeta`
  - `label`
  - `totalCandidates`
  - `rankingBasis`


```json
{
  "snapshotMeta": {
    "key": "snapshot:daily",
    "freshness": "fresh | stale | fallback",
    "generatedAt": "ISO date",
    "sourceUpdatedAt": "ISO date",
    "partialFailure": false,
    "errorSummary": null
  }
}
```

- `fresh`: 최신 계산 결과
- `stale`: 이전 성공 스냅샷 재사용
- `fallback`: 새 계산 실패 후 이전 스냅샷으로 대체 응답

## 캐시 / fallback 메모

- 일부 API는 캐시된 응답을 우선 반환합니다.
- ETF/스크리닝 계열 응답은 stale cache를 반환할 수 있습니다.
- 외부 데이터 수집 실패 시 일부 지표는 fallback 또는 추정값이 사용될 수 있습니다.
- 응답 소비 시 `updatedAt`, data source 배지, stale/fallback 여부를 함께 해석하는 것이 좋습니다.
