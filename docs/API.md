# API 문서

## 판독기 API

### GET /api/screener/chart/:ticker
차트 판독기 - 이동평균선, 이격도, RSI, 패턴 분석

### GET /api/screener/valuation/:ticker
주가 판독기 - 적정주가, PER, PEG 분석

### GET /api/screener/sentiment
역발상 판독기 - VIX, Put/Call Ratio, AAII 등

### GET /api/screener/combined/:ticker
3종 판독기 통합 분석 (0-60점)

## 점수 체계
- 각 판독기: 0-20점 (높을수록 매수 유리)
- 통합: 0-60점
  - 46-60: 적극 매수 (극도 공포)
  - 36-45: 분할 매수
  - 26-35: 관망
  - 16-25: 분할 매도
  - 0-15: 적극 매도 (극도 환호)

## 핵심 공식
```
적정주가 = 예상 EPS × 적정 PER
적정 PER = EPS 성장률(%) 중앙값
이격도 = (현재가 - 50일선) / 50일선 × 100
PEG = PER / EPS 성장률
```
