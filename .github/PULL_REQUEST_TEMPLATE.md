# [PR 요약]

## 요약

- 변경 핵심:
- 영향 범위:
- 참고 이슈/티켓:

## 검증 체크리스트

- [ ] `CI pass gate`가 성공했는지 확인 (`CI` 체크 목록에서 필수)
- [ ] `CI pass gate` 집계에서 아래 항목이 모두 `success`인지 확인
  - `backend-lint-and-typecheck`
  - `backend-test`
  - `client-typecheck`
  - `client-test`
  - `sdk-check`
  - `debug-recorder-admin-check`
  - `figma-plugin-check`
  - `build`
- [ ] `skipped` 항목이 하나라도 있으면 PR 병합 대기
- [ ] `push` 반영 시 `ci-pass-gate-push-summary` 코멘트(`성공/실패`)를 확인
- [ ] 변경 코드에 대한 테스트/유형 검사 실행 또는 결과 확인 (예: `pnpm lint`, `pnpm typecheck`, 관련 `test:cov`)
- [ ] 배포/설정 변경인 경우 Vercel 운영 배포 영향 검토

## 변경 상세

- API/동작 변경:
- 마이그레이션/환경 변수 변경:
- 주의 사항:

## CodeRabbit 반영

- 리뷰 코멘트 중 `critical`/`high`로 표시된 항목 반영 또는 대응 이유 기록

## 추가 노트

- 실패한 CI 항목이 있을 경우:
  - 우선순위에 따라 실패 항목 링크를 남겨 주세요.
