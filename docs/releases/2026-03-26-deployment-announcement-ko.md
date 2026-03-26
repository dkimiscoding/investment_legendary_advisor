# 2026-03-26 배포 공지

## 배포 완료
투자 분석 서비스의 신뢰도 표시와 시장 컨텍스트를 강화하는 업데이트를 배포했습니다.

## 주요 변경 사항
- 분석 결과 상단에 **데이터 신뢰도 표시**를 강화했습니다.
- 서로 다른 원점수 체계를 **100점 기준으로 환산 표시**하도록 개선했습니다.
- 원점수도 함께 보여주어 해석 맥락을 유지합니다.
- 메인 화면에 **시장 심리 신호등 대시보드**를 추가했습니다.
  - VIX
  - WTI Oil
  - DXY
  - 미국 10년물 금리
- 주요 screening/analysis 응답에 `scoreDisplay`, `reliability`, `universeMeta` 메타데이터를 반영했습니다.
- Next.js build 환경 설정을 정리해 배포 로그의 불필요한 workspace-root 경고를 제거했습니다.

## 추가 수정 사항
배포 후 production 환경에서 일부 단일 종목 분석이 실패하던 문제를 수정했습니다.
- 원인: Yahoo `historical()` 응답의 부분 null 데이터
- 조치: `historical()` 실패 시 `chart()` 데이터로 안전하게 폴백하도록 수정

## 검증 결과
- 홈 `/` 정상 응답
- `/discover`, `/etf`, `/legends` 정상 응답
- `/api/screener/combined/AAPL` 정상 응답
- production 브라우저 smoke QA 완료

## 현재 운영 주소
- Production: https://investment-advisor-one.vercel.app

## 참고
이번 배포는 결과를 더 “예쁘게” 보이게 하는 것보다,
**사용자가 결과를 얼마나 신뢰할 수 있는지 먼저 판단할 수 있도록 만드는 데 초점**을 두었습니다.
