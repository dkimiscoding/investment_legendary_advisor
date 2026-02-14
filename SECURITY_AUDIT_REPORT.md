# Investment Advisor 보안 점검 보고서

**점검 일시:** 2026-02-14  
**대상:** https://investment-advisor-one.vercel.app  
**점검자:** Shannon (AI Security Auditor)

---

## 📊 점검 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| **종합 등급** | 🟡 **B+** | 개선 권고사항 2건 |
| Input Validation | ✅ 양호 | 티커 검증 완료 |
| Rate Limiting | ✅ 양호 | 분당 30회 제한 |
| 환경변수 노출 | ✅ 양호 | .gitignore 처리 |
| 의존성 취약점 | ⚠️ 주의 | High 3건 (개발용) |
| CORS 설정 | ✅ 양호 | 기본값 사용 |

---

## ✅ 양호 항목

### 1. 티커 입력 검증 (Input Validation)
```typescript
const TICKER_REGEX = /^[A-Za-z0-9.\-^]{1,10}$/;
```
- ✅ 정규식 기반 검증
- ✅ Path Traversal 방지
- ✅ SQL Injection 방지 (ORM 사용)

### 2. Rate Limiting
- ✅ IP 기반 분당 30회 제한
- ✅ Sliding Window 방식
- ✅ 429 응답 with Retry-After 헤더

### 3. 환경변수 관리
- ✅ `.env*.local`이 .gitignore에 포함
- ✅ `.env.example`만 버전 관리
- ✅ 실제 키 값은 비어있음
- ✅ Git 히스토리에 민감 정보 없음

### 4. 에러 핸들링
- ✅ 모든 API route에 try-catch
- ✅ 스택 트레이스 노출 안 함
- ✅ 500 에러 메시지 제한적

---

## ⚠️ 개선 권고사항

### 1. NPM 의존성 취약점 (High)

**취약점:**
- `glob` 10.2.0 - 10.4.5: Command injection 취약점
- `@next/eslint-plugin-next` → `glob` 의존
- `eslint-config-next` 14.x → 취약한 버전 사용

**영향:**
- 개발용 의존성 (eslint) → 프로덕션 영향 없음
- 직접적인 보안 위험 낮음

**조치:**
```bash
npm audit fix --force
# 또는 수동 업데이트
npm install eslint-config-next@latest
```

**우선순위:** 🟡 중간 (개발 환경)

---

### 2. 환경변수 유효성 검증

**현황:**
```env
FRED_API_KEY=
FMP_API_KEY=
```

**권고:**
- 런타임에 필수 환경변수 체크 로직 추가
- 누락 시 명확한 에러 메시지 반환

**코드 예시:**
```typescript
// src/lib/env-check.ts
export function validateEnv() {
  const required = ['FRED_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }
}
```

**우선순위:** 🟢 낮음 (기능 개선)

---

## 🔍 상세 점검 내역

### API 엔드포인트 보안

| 엔드포인트 | Method | 인증 | 검증 | 비고 |
|-----------|--------|------|------|------|
| `/api/screener/combined/[ticker]` | GET | 없음 ✅ | 티커 검증 ✅ | 공개 API |
| `/api/screener/chart/[ticker]` | GET | 없음 ✅ | 티커 검증 ✅ | 공개 API |
| `/api/screener/valuation/[ticker]` | GET | 없음 ✅ | 티커 검증 ✅ | 공개 API |
| `/api/screener/sentiment` | GET | 없음 ✅ | N/A | 시장 데이터 |
| `/api/screening/*` | GET | 없음 ✅ | N/A | 스크리닝 데이터 |

**참고:** 현재 모든 API가 공개(인증 불필요)로 설계됨. 이는 의도된 설계이며, Rate Limiting으로 보호됨.

---

### 보안 헤더 현황

현재 `next.config.mjs`에서 보안 헤더 미설정:

**권고 추가:**
```javascript
// next.config.mjs
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    },
  ];
}
```

**우선순위:** 🟢 낮음

---

## 📝 조치 계획

### 즉시 조치 (Today)
- [ ] `npm audit fix --force` 실행 (개발 환경)

### 단기 조치 (This Week)
- [ ] 환경변수 유효성 검증 로직 추가
- [ ] 보안 헤더 설정 추가

### 검토 완료 ✅
- [x] 티커 검증 로직 확인
- [x] Rate Limiting 동작 확인
- [x] Git 히스토리 검색
- [x] ENV 파일 노출 여부 확인

---

## 🎯 결론

**투자자문 앱은 전반적으로 양호한 보안 수준을 유지하고 있습니다.**

- **심각한 취약점:** 없음
- **주의 필요:** NPM 개발 의존성 (High 3건)
- **권고사항:** 보안 헤더 추가, 환경변수 검증 강화

**총평:** 프로덕션 배포에 적합하며, 권고사항 적용 시 A 등급 달성 가능

---

*보고서 생성: Shannon AI Security Auditor*  
*검증 일시: 2026-02-14*
