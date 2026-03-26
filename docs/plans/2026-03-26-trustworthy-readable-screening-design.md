# Trustworthy & Readable Screening Experience Design

**Date:** 2026-03-26
**Status:** Approved
**Focus:** 데이터 신뢰도 우선, 가독성 개선, 100점 환산 점수, 더 명확한 유니버스/재정렬 정책

---

## 1. Problem Statement

현재 서비스는 분석 축과 정보량은 충분하지만, 사용자 입장에서 가장 중요한 두 가지가 아직 일관되게 드러나지 않는다.

1. **이 결과를 얼마나 믿어도 되는가**
   - fresh / stale / fallback / 추정치가 존재하지만 화면 전반에서 강도 있게 일관되게 보이지 않는다.
   - 결과는 있어도, 어떤 지표가 fallback인지와 그 영향 범위를 빠르게 판단하기 어렵다.

2. **정보가 잘 정리되어 있는가**
   - 정보량 자체는 문제되지 않지만, 사용자가 읽는 순서가 정돈되어 있지 않다.
   - 서로 다른 만점 체계(20/25/70/90)가 섞여 있어 직관적 비교가 어렵다.

이번 개선의 핵심은 **결과는 최대한 그대로 보여주되, 신뢰도 경고를 강하게 붙이고, 정보를 읽기 좋은 계층으로 재구성하는 것**이다.

---

## 2. Product Goals

### Primary Goals
- 사용자가 결과를 보기 전에 **데이터 신뢰도**를 먼저 판단할 수 있게 한다.
- 화면의 모든 핵심 점수를 **100점 기준으로 직관적으로 비교**할 수 있게 한다.
- 정보량은 유지하되, **결론 → 핵심 근거 → 상세 데이터** 순서로 읽히게 만든다.
- 추천/랭킹이 **현재 기준으로 재정렬되는 서비스**라는 점을 명확히 보여준다.

### Non-Goals
- fallback/stale 데이터라는 이유만으로 점수를 임의로 깎지 않는다.
- 범위를 벗어나는 새로운 투자 전략/새 점수 모델을 이번 단계에서 만들지 않는다.
- 모든 유니버스를 동적 외부 소스로 즉시 교체하지 않는다.

---

## 3. Approved UX Principles

1. **신뢰도 우선 표시**
   - “무슨 결과인가”보다 “얼마나 믿을 수 있는가”를 먼저 보여준다.

2. **결과는 유지, 경고는 강화**
   - stale/fallback이어도 가능한 한 결과는 보여준다.
   - 대신 상단과 섹션별 경고를 강하게 표시한다.

3. **100점 환산 기본, 원점수 병기**
   - 사용자에게는 `78/100`처럼 보여주고,
   - 보조 정보로 `(원점수 55/70)`를 함께 제공한다.

4. **많은 정보는 허용, 구조 없는 정보는 금지**
   - 정보량 축소보다, 읽기 순서와 구획이 더 중요하다.

5. **유니버스와 재정렬 기준을 투명하게 노출**
   - 어떤 종목 집합에서, 어떤 기준으로 랭킹했는지 명확히 설명한다.

---

## 4. Information Architecture

주요 화면(`/`, `/discover`, `/etf`, `/legends`)은 가능한 한 아래 계층을 공통으로 사용한다.

### Layer 1 — Reliability Summary Bar
가장 위에 배치한다.

표시 항목:
- `Fresh / Stale / Fallback / 일부 추정치 포함`
- 생성 시각 (`generatedAt`)
- 원본 기준 시각 (`sourceUpdatedAt`)
- fallback 또는 추정 지표 개수
- 사용자용 한 줄 해석

예시 문구:
- “최신 계산 결과입니다.”
- “최근 성공 스냅샷을 재사용하고 있습니다.”
- “새 계산에 실패해 이전 성공 결과를 보여줍니다.”
- “일부 시장 심리 지표는 실시간이 아닙니다.”

### Layer 2 — Key Conclusion Card
신뢰도 바 바로 아래에 배치한다.

표시 항목:
- 최종 판정
- 100점 환산 총점
- 원점수 병기 (`55/70`, `72/90` 등)
- 액션 가이드 1줄
- 핵심 근거 3~5개

### Layer 3 — Evidence Sections
차트 / 가치 / 심리 / 배당 / 레전드 섹션을 카드형으로 정리한다.

각 섹션 공통 표시:
- 100점 환산 점수
- 원점수
- 데이터 상태
- 핵심 시그널

### Layer 4 — Detailed Metrics
세부 원문과 숫자, 부가 설명은 하단에 남긴다.

---

## 5. Scoring Display Model

### Display Rule
모든 핵심 점수는 기본적으로 아래 형식으로 표기한다.

- `78/100`
- `(원점수 55/70)`

### Section Examples
- 차트 분석: `84/100 (21/25)`
- 가치 평가: `65/100 (13/20)`
- 시장 심리: `72/100 (18/25)`
- 배당 분석: `90/100 (18/20)`

### Ranking Rule
- `/discover`, `/etf`, `/legends` 카드와 리스트는 **100점 환산 점수 기준**으로 보여준다.
- 내부 계산 로직은 원점수 체계를 유지해도 된다.

### Important Constraint
- fallback/stale 데이터라는 이유만으로 **점수 자체를 보정하거나 감점하지 않는다.**
- 점수와 신뢰도는 분리한다.

---

## 6. Reliability Model

### Reliability Is Separate From Score
- **점수:** 계산 결과
- **신뢰도:** 계산에 사용된 데이터의 최신성/대체 여부

### Proposed Levels
- `high` — 주요 지표가 fresh/live
- `medium` — stale 또는 일부 fallback 포함
- `caution` — fallback 비중이 크거나 핵심 지표가 추정치

### Reliability Inputs
- snapshot freshness (`fresh`, `stale`, `fallback`)
- `partialFailure`
- fallback/estimated metric labels
- 생성 시각과 원본 시각 차이

### UI Rule
- 상단 요약 바에 강하게 표시
- 섹션별로도 영향 받은 지표를 함께 표기
- 결과는 숨기지 않음

---

## 7. Universe & Reordering Policy

서비스는 단순 정적 추천 목록이 아니라 **현재 기준으로 충분히 넓은 유니버스에서 재정렬하는 분석기**여야 한다.

### Approved Baseline Universe
기본 주식 유니버스는 다음 세 집합의 합집합(중복 제거)으로 정의한다.

1. **S&P 500 시가총액 상위 100개**
2. **Dow Jones 30 전 종목**
3. **Nasdaq 핵심 상위 50개 종목**

### Product Rule
- 추천과 랭킹은 가능한 한 **현재 최신 데이터 기준으로 재계산**한다.
- stale/fallback인 경우에는 **마지막 성공 snapshot 기준 정렬**임을 명시한다.
- 사용자는 화면에서 아래 메타데이터를 바로 볼 수 있어야 한다.

표시 항목:
- `유니버스: S&P500 Top 100 + Dow 30 + Nasdaq Top 50`
- `정렬 기준: 최신 분석 점수`
- `계산 시점`
- `현재 재계산인지 / 마지막 성공 snapshot인지`

### Migration Strategy
- 단기적으로는 기존 정적 `ALL_TICKERS` 구조를 활용하되,
- 중기적으로는 **유니버스 선정 로직 + 표시 메타데이터 + 정렬 로직**을 분리한다.

---

## 8. Domain / API Design

### Domain Layers
1. **Universe layer**
   - 스캔 대상 종목을 결정한다.
2. **Scoring layer**
   - 차트/가치/심리/배당/레전드 점수를 계산한다.
3. **Presentation layer**
   - 100점 환산, 신뢰도 레벨, 경고 문구, 유니버스 메타데이터를 생성한다.

### Response Metadata Additions
주요 응답에는 아래 표시용 메타데이터를 공통으로 포함한다.

- `scoreDisplay`
  - `normalizedScore`
  - `rawScore`
  - `rawMaxScore`
- `reliability`
  - `level`
  - `freshness`
  - `fallbackMetrics`
  - `generatedAt`
  - `sourceUpdatedAt`
- `universeMeta`
  - `label`
  - `totalCandidates`
  - `rankingBasis`
  - `isLiveReordered`

### Error Policy
- fresh 계산 실패 + stale 존재 → stale 응답 + 강한 경고
- 일부 지표 fallback → 결과 유지 + 영향 지표 표시
- 유니버스 일부만 계산 성공 → 성공/실패 개수 공개
- 완전 실패 → 실패 원인 + 마지막 성공 기준 우선 표시

---

## 9. Verification Strategy

이번 개선은 “정확하게 계산했는가”와 “정직하게 보여주는가”를 함께 검증해야 한다.

### Must Verify
- 100점 환산 계산이 모든 주요 점수에서 일관적인지
- freshness/fallback/live 조합별 신뢰도 레벨이 올바른지
- snapshot 메타데이터가 표시 모델로 제대로 전달되는지
- 유니버스 메타데이터가 의도한 범위를 설명하는지
- UI가 점수/원점수/경고/정렬 기준을 올바르게 렌더링하는지

---

## 10. Rollout Order

1. 공통 점수 표시/신뢰도 모델 정의
2. 상세 페이지(`/`)에 먼저 적용
3. `/discover`, `/etf`, `/legends`에 확장
4. 유니버스 메타데이터와 재정렬 표현 정리
5. 문구와 경고 강도 튜닝

---

## 11. Repository Constraints Observed During Brainstorming

- 현재 `main` 워킹트리에 사용자 변경사항이 이미 존재한다.
- 따라서 이번 단계는 **설계/계획 문서 중심**으로 진행하고, 구현 시에는 기존 변경을 덮어쓰지 않도록 주의한다.
- 현재 검증 상태:
  - `npm run typecheck` ✅
  - `npm test` ✅
  - `npm run build` ✅
  - `npm run lint` ⚠️ (`src/app/page.tsx` unused var 1건)
  - `next build` 시 workspace root 경고 1건

---

## 12. Final Recommendation

가장 적절한 방향은 **신뢰도 우선 + 가독성 재구성 + 100점 환산 + 유니버스 투명성 강화**의 조합이다.

이 서비스의 핵심 가치는 “정보가 많음”이 아니라, **현재 결과를 신뢰할 수 있는지 빠르게 판단하면서도 충분한 근거를 읽을 수 있게 하는 것**에 있다.
