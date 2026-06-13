# Unified Client Redesign — Design System

토큰·타이포·라운드·모션은 `client/src/index.css` + `DESIGN.md` 를 단일 출처로 그대로 사용한다.
색은 정보(상태/선택/심각도)에만 쓰고 중립 그레이스케일이 구조를 담당한다. 다크모드 페어링 포함.

## 토큰 (요약)

- 표면: `bg / bg-subtle / bg-muted / surface / surface-raised / surface-overlay`
- 전경: `fg / fg-muted / fg-subtle / fg-faint`
- 경계/포커스: `border / border-strong / ring`
- 액센트(단일 블루): `accent / accent-fg / accent-soft / accent-soft-fg`
- 상태: `success / warning / danger / info` (+ `-soft`, `-fg`), 라이브: `live / live-soft / live-soft-fg`
- 라운드: `xs(3) sm(5) md(7) lg(10) xl(14) 2xl(18) 3xl(28)` · 폰트: Inter Variable / JetBrains Mono

Tailwind 유틸: `bg-bg`, `text-fg`, `border-border`, `bg-accent-soft`, `text-danger`, `shadow-md` 등.
원시 팔레트(`slate-*`,`violet-*`) 금지 — 토큰만 사용(CLAUDE.md 규약).

## 기존 프리미티브 (재사용)

`button, badge, card, input, dialog, command, select, tabs, tooltip, dropdown-menu, separator,
scroll-area, skeleton, spinner, empty-state, toaster, animated-number, kbd`.

## 신규 프리미티브 (antd 대체용 추가)

| 신규 ui/* | 대체 대상(antd) | 비고 |
| --- | --- | --- |
| `table.tsx` | Table | 헤더/행/셀/정렬·밀도·빈상태. 가상스크롤은 필요 시 `@tanstack/react-virtual`. |
| `data-table.tsx` | Table(페이지네이션) | 컬럼정의·정렬·페이지네이션·행선택 헬퍼(경량). |
| `pagination.tsx` | Pagination | 이전/다음 + 페이지 인디케이터. |
| `switch.tsx` | Switch | Radix Switch. 라이브 토글 등. |
| `checkbox.tsx` | Checkbox | Radix Checkbox. |
| `label.tsx` + `field.tsx` | Form.Item | 라벨·설명·에러를 묶는 폼 필드. RHF 연동. |
| `textarea.tsx` | Input.TextArea | 노트/메모. |
| `alert.tsx` | Alert | info/success/warning/danger 배너. |
| `stat.tsx` | Statistic | 대시보드 KPI 카드(라벨+값+델타). |
| `steps.tsx` | Steps | 가이드 절차 표시. |
| `collapsible.tsx` | Collapse | Radix Collapsible(이벤트 payload 접기). |
| `tag-input.tsx` | Select(tags) | 디바이스/태그 다중 입력. |
| `code-block.tsx` | react-syntax-highlighter | 경량 `<pre>` + 복사. 의존성 0. |
| `timeline.tsx` | Timeline | 활동/이벤트 타임라인. |
| `status-dot.tsx` | Badge(status) | 세션 상태 점(색=상태, 라벨 병기). |
| `segmented.tsx` | Segmented/Radio.Group | 기간/뷰 토글(day·week·month, ticket·record). |

모든 신규 프리미티브는 `forwardRef`, CVA variants, `cn()` 합성, 토큰 색상, focus-visible 링,
default/hover/focus/active/disabled 상태 5종을 반드시 갖춘다(PRODUCT.md "Never half-ship a state").

## antd → Radix/Tailwind 매핑 (화면 단위)

- Layout/Header/Sider/Content → 기존 `components/layout/*` (이미 존재) 재사용.
- Menu → `nav.ts` + Sidebar(이미 존재).
- Card/Row/Col/Space → `Card` + Tailwind `grid`/`flex gap-*`.
- Form/Form.Item/Input/Select/DatePicker → RHF + `field`/`input`/`select`/(date 는 native input[type=date]).
- Table/Pagination → `data-table` + `pagination`.
- Modal/Drawer → `dialog`.
- Tabs/Collapse/Steps/Timeline/Statistic/Tag/Badge/Alert/Spin/Empty → 위 신규/기존 프리미티브.
- message/notification → `sonner` `toast`.
- @ant-design/icons → `lucide-react`.

## 폼 정책

검증·제출이 있는 멀티필드 폼(프로필, 팀 멤버 초대/수정)은 `react-hook-form` + `zod`(`zodResolver`).
단일 필드 검색/필터(세션·이벤트 검색, 기간 토글)는 `useState` 유지(client 규약과 동일).
