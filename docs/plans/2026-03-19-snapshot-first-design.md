# Snapshot-First Design Stub

## 목적

현재 요청 시 계산 중심 구조를 줄이고, 주요 스크리닝 응답을 **snapshot-first** 방식으로 전환하기 위한 2차 설계 초안입니다.

## 현재 한계

### 1. 인메모리 캐시
- `src/lib/cache.ts`는 프로세스 메모리 기반입니다.
- 서버 재시작 시 캐시가 사라집니다.
- 멀티 인스턴스 환경에서는 인스턴스별로 캐시가 분리됩니다.

### 2. 인메모리 rate limit
- `src/middleware.ts` 역시 프로세스 메모리 기반입니다.
- 서버리스 환경에서 일관된 보호 수단으로 보기 어렵습니다.

### 3. 요청 시 계산 비용
- `/api/screening/daily`, `/api/screening/etf`, `/api/screening/legends`는 계산량이 큽니다.
- warm cache가 없으면 응답시간이 길어질 수 있습니다.
- 외부 데이터 지연/실패가 바로 사용자 응답 실패로 이어질 수 있습니다.

## 제안 구조

### 저장 대상
최소 3개 snapshot을 외부 저장소에 보관합니다.

1. `daily_screening_snapshot`
2. `etf_screening_snapshot`
3. `legends_snapshot`

### 최소 스키마 예시

```text
id
snapshot_type        -- daily / etf / legends
payload_json         -- 전체 응답 JSON
status               -- fresh / stale / failed
generated_at
source_updated_at
partial_failure
error_summary
```

## 읽기 순서

모든 주요 스크리닝 API는 아래 순서를 따릅니다.

1. **fresh snapshot 반환**
2. fresh가 없으면 **stale snapshot 반환**
3. snapshot이 전혀 없을 때만 **compute-on-miss**

## 갱신 전략

- 스케줄 기반 background refresh 우선
- 수동 refresh는 snapshot 재생성 트리거로 사용
- stale 응답 반환 시 freshness 메타데이터를 반드시 포함

## API 응답 메타데이터 제안

```json
{
  "freshness": "fresh | stale | fallback",
  "generatedAt": "ISO date",
  "sourceUpdatedAt": "ISO date",
  "partialFailure": false,
  "errorSummary": null
}
```

## Sprint 2 검증 기준

1. warm read에서 사용자 체감 타임아웃이 없어야 함
2. 주요 스크리닝 API가 freshness 메타데이터를 포함해야 함
3. 외부 데이터 실패 시 전체 500 대신 stale snapshot 반환이 우선되어야 함
4. 새 snapshot 생성 실패가 기존 성공 snapshot을 덮어쓰지 않아야 함

## 구현 우선순위

1. snapshot 저장 스키마 정의
2. daily snapshot 우선 적용
3. etf snapshot 적용
4. legends snapshot 적용
5. stale/fresh UI 표기 연결
