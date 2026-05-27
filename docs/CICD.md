# CI/CD setup

## Workflows

| File | Trigger | What it does |
|------|---------|--------------|
| `.github/workflows/ci.yml` | every push / PR | lint + typecheck + test + build (backend, SDK, client, debug-recorder-admin, figma-plugin) |
| `.coderabbit.yaml` | App 설치 후 모든 PR | PR 단위 AI 코드 리뷰 규칙 및 톤 설정 |
| `.github/workflows/deploy-vercel.yml` | workflow_dispatch + `workflow_run(CI/main)` | builds + deploys the public Vercel demo |
| `.github/workflows/pr-checklist-enforcer.yml` | PR `opened`/`edited`/`synchronize` | same-repo PR의 CI 체크리스트 누락 항목 자동 안내 |

## CI 게이트 운영

브랜치 보호 규칙(Branch protection rules)에서 `CI pass gate` 체크를 필수로 설정하면,
`backend-lint-and-typecheck`, `backend-test`, `client-typecheck`, `client-test`,
`sdk-check`, `debug-recorder-admin-check`,
`figma-plugin-check`,
`build`의 모든 필수 작업이 통과되어야 병합이 가능해집니다.

PR 템플릿([`.github/PULL_REQUEST_TEMPLATE.md`](/Users/hjunkim/WebstormProjects/remote-devtools/.github/PULL_REQUEST_TEMPLATE.md))의 체크항목을 기준으로,
`CI pass gate` `success`/`skipped` 상태를 수동 검토해야 하며,
`skipped` 항목이 있으면 병합 전 해결이 필요합니다.
같은 레포지토리 PR(`same-repo PR`)의 경우에는
`pr-checklist-enforcer` 워크플로우가 누락된 체크리스트 항목을 자동 코멘트로 알려주고,
필수 항목이 미체크 상태라면 상태 체크를 실패 처리해 병합이 막히도록 합니다.
체크리스트 항목에는 PR 템플릿의 필수 검증 항목과 더불어, `push` 반영 시 확인해야 하는
`ci-pass-gate-push-summary` 코멘트 점검 항목도 함께 포함됩니다.
동일한 PR에서는 `ci-pass-gate-pr-summary` 코멘트가 `성공/실패` 상태를 실시간으로 갱신하고,
`push` 이벤트에서는 커밋에 `ci-pass-gate-push-summary` 코멘트를 남겨 원격 푸시 직후 성공/실패 상태를 바로 확인할 수 있습니다.
단, Draft PR에서는 해당 워크플로우가 수행되지 않으므로 `Ready for review` 전환 후에 최종 체크가 필요합니다.

### 빠른 실패 대응

- `CI pass gate`가 실패한 경우 우선 아래 순서로 확인하면 된다.
- 각 잡의 아티팩트:
  - `backend-test`: `backend-coverage`
  - `client-test`: `client-coverage`
  - `sdk-check`: `sdk-coverage`
  - `figma-plugin-check`: 별도 커버리지 아티팩트 없음(정적 검사/빌드 점검)
- 원인별 우선순위 대응:
1. 포맷/ESLint/타입 오류 (`backend-lint-and-typecheck`)
2. 백엔드 단위 테스트 실패 (`backend-test`)
3. 클라이언트 타입 검사 (`client-typecheck`)
4. 클라이언트 테스트 실패 (`client-test`)
5. SDK 타입 검사/커버리지 (`sdk-check`)
6. Debug Recorder Admin 정적 검사 및 빌드 (`debug-recorder-admin-check`)
7. Figma Plugin lint/typecheck (`figma-plugin-check`)
8. 통합 빌드 실패 (`build`)

참고: `CI pass gate`는 각 필수 잡이 `success`인지 정확히 검사합니다.
`skipped` 상태는 실패로 간주되어, 푸시/PR 모두에서 패스 판정을 엄격하게 보장합니다.
`ci-pass-gate` 실행 결과는 `ci-pass-gate-summary` 아티팩트(JSON)로도 저장되므로,
추후 감사/분석에서 자동으로 결과를 재활용할 수 있습니다.

### 권장 브랜치 보호 규칙 설정

브랜치 보호 규칙을 통해 `CI pass gate`를 필수 체크로 등록하면, 병합이 그 전에 막히므로
“원격 푸시 후 CI 실패”가 실제로 배포/병합에 반영됩니다.

- `main` 브랜치 기준 필수 체크 리스트:
  - `CI pass gate`
  - (same-repo 협업을 엄격히 지키는 팀이라면) `pr-checklist-enforcer`
- 보통 함께 추가하는 권장 옵션:
  - `Require a pull request before merging`
  - `Require review from code owners`
  - `Require status checks to pass before merging`

권장 적용 위치:

- GitHub Repository → Settings → Branches → Branch protection rules → Add rule
- 브랜치: `main`
- Require a pull request before merging: 활성화
- Require status checks to pass before merging: 활성화
- Required status checks: `CI pass gate` 체크
- `pr-checklist-enforcer`는 same-repo PR에서만 동작하므로, fork PR이 허용되는 저장소는 팀 정책에 따라 적용 여부를 결정하세요.

`develop` 또는 `release/*`에 동일 적용이 필요한 경우에도 `CI pass gate`만 필수로 추가하면 됩니다.

## 원격 푸시 후 CI 확인 루틴

원격 `push`가 발생하면 CI는 자동 실행됩니다. 병합/배포 전 최종 확인용으로 다음 순서를 추천합니다.

1. `CI pass gate`가 `success`인지 확인한다.
2. `CI pass gate`에 포함된 핵심 잡(`backend-lint-and-typecheck`, `client-test`, `sdk-check`, `build` 등)이 모두 `success`인지 확인한다.
3. 실패 시 `backend-test`, `client-test`, `sdk-check`의 커버리지/로그 아티팩트를 먼저 확인한다.
4. `pr-checklist-enforcer`가 통과(성공) 상태인지 확인해 필수 체크리스트가 모두 체크되었는지 검증한다.

GitHub CLI로 실행 내역을 확인하려면:

```bash
gh run list --workflow "CI" --branch main --limit 5
```

특정 실행의 게이트 스텝을 바로 보려면:

```bash
gh run view <run-id> --log | sed -n '1,200p'
```

아티팩트 기반으로 요약만 보고 싶다면(예: 최신 run):

```bash
run_id=$(gh run list --workflow "CI" --branch main --limit 1 --json databaseId --jq '.[0].databaseId')
gh run view "$run_id" --name "CI pass gate" --log
gh run download "$run_id" --name ci-pass-gate-summary
cat ci-pass-gate-summary/ci-pass-gate-summary.json
```

> `ci-pass-gate-summary`는 필수 체크의 집계 결과를 JSON으로 남겨 이력 비교 또는 외부 감사에 활용할 수 있습니다.

## 수동 재실행

CI 워크플로는 수동 실행도 가능합니다.

- GitHub Actions → CI → `Run workflow`
- 또는 이벤트 트리거(`workflow_dispatch`)로 직접 실행

Vercel 배포는 수동 실행 또는 CI main 브랜치 성공 완료 후 자동 트리거됩니다.

## Required GitHub secrets

The Vercel deploy workflow needs three secrets on the repo
(Settings → Secrets and variables → Actions):

| secret | how to obtain |
|--------|---------------|
| `VERCEL_TOKEN` | https://vercel.com/account/tokens — create a scoped token |
| `VERCEL_ORG_ID` | Vercel Settings → General → "Your ID" — org / team id |
| `VERCEL_PROJECT_ID` | Project Settings → General → "Project ID" |

Alternatively, the existing local `.vercel/project.json` carries
`projectId` and `orgId` — copy them directly.

After setting the secrets:

```
git push origin main
```

The workflow runs and posts the deploy URL to the GitHub Actions summary.

## Manual deploy

If GitHub Actions is unavailable or you want to deploy from your laptop:

```bash
vercel deploy --prod
```

The CLI uses `~/Library/Application Support/com.vercel.cli/auth.json` for
auth — no secrets needed locally.

## Optional: PR preview deploys

Vercel automatically deploys a preview URL for every push to a non-`main`
branch (when the GitHub integration is connected). The workflow above only
handles **production**; preview deploys are a one-time toggle in the Vercel
dashboard.

## Rollback

```bash
vercel rollback <deployment-url>
# or via dashboard: Project → Deployments → Promote
```
