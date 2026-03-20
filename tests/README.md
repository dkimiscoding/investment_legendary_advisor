# Test Harness

이 디렉터리는 Next.js 런타임이 아닌 **순수 TypeScript 도메인 로직**만 검증합니다.

원칙:
- `src/lib/screeners/*` 같은 순수 함수 위주로 테스트합니다.
- 테스트 파일에서는 경로 별칭(`@/...`) 대신 **상대 경로 import**를 사용합니다.
- 빌드 산출물은 `npm test` 실행 시 `.tmp/tests` 아래에 생성됩니다.
