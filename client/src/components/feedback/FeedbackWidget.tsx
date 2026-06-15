/**
 * SurveyDesk — 단일 파일 벤더링 컴포넌트 (의존성: react 만).
 * ──────────────────────────────────────────────────────────────────────────
 * SurveyDesk(@surveydesk/widget)의 npm publish 가 막혀 있는 동안, 형제 앱에
 * 그대로 복붙해서 쓰는 self-contained 버전입니다. 워크스페이스 의존(@surveydesk/shared) 0 —
 * 필요한 상수·검증 로직을 이 파일에 인라인했습니다. 동작/디자인은 정본과 동일합니다.
 *
 * 원본: surveydesk/apps-vendor/FeedbackWidget.tsx (코드 스타일만 이 앱에 맞춤).
 *
 * 사용:
 *   import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';
 *   <FeedbackWidget appId="remotedevtools" endpoint="https://surveys.example.com" />
 *
 * 백엔드 계약(공개·무인증):
 *   GET  {endpoint}/api/surveys/{appId}/active      → SurveyDto (없으면 404)
 *   POST {endpoint}/api/surveys/{appId}/responses   → { id, surveyVersion, ... }
 *
 * 접근성/디자인: focus-visible · prefers-reduced-motion · 대비 ≥4.5:1 ·
 * 그라디언트 텍스트/글래스모피즘/사이드스트라이프 없음 · 외부 CSS 프레임워크 0
 * (인라인 <style> 로 스타일을 self-host 하므로 앱 Tailwind 토큰과 독립적).
 * ──────────────────────────────────────────────────────────────────────────
 */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';

/* ============================ 공유 계약(인라인) ============================ */

const RATING_MIN = 1;
const RATING_MAX = 5;
const NPS_MIN = 0;
const NPS_MAX = 10;
const TEXT_MAX = { short: 280, long: 4000 } as const;

type QuestionType = 'rating' | 'nps' | 'single_choice' | 'multi_choice' | 'text';
type TextVariant = 'short' | 'long';

interface SurveyOption {
  value: string;
  label: string;
}
interface SurveyQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required?: boolean;
  variant?: TextVariant;
  options?: SurveyOption[];
}
interface SurveyDto {
  appId: string;
  version: number;
  title: string;
  intro: string | null;
  questions: SurveyQuestion[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
type AnswerValue = number | string | string[] | boolean;

interface AnswerError {
  questionId: string;
  message: string;
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** 제출 전 1차 검증(서버가 2차로 재검증). @surveydesk/shared 의 validateAnswers 동치. */
function validateAnswers(
  questions: SurveyQuestion[],
  answers: Record<string, unknown>,
): { ok: boolean; errors: AnswerError[]; value: Record<string, unknown> } {
  const errors: AnswerError[] = [];
  const value: Record<string, unknown> = {};
  for (const q of questions) {
    const raw = answers[q.id];
    if (isEmpty(raw)) {
      if (q.required) errors.push({ questionId: q.id, message: '필수 항목입니다' });
      continue;
    }
    switch (q.type) {
      case 'rating':
        if (!isInt(raw) || raw < RATING_MIN || raw > RATING_MAX)
          errors.push({
            questionId: q.id,
            message: `별점은 ${RATING_MIN}–${RATING_MAX} 정수여야 합니다`,
          });
        else value[q.id] = raw;
        break;
      case 'nps':
        if (!isInt(raw) || raw < NPS_MIN || raw > NPS_MAX)
          errors.push({ questionId: q.id, message: `NPS는 ${NPS_MIN}–${NPS_MAX} 정수여야 합니다` });
        else value[q.id] = raw;
        break;
      case 'single_choice': {
        const allowed = new Set((q.options ?? []).map((o) => o.value));
        if (typeof raw !== 'string' || !allowed.has(raw))
          errors.push({ questionId: q.id, message: '정의된 보기 중 하나여야 합니다' });
        else value[q.id] = raw;
        break;
      }
      case 'multi_choice': {
        const allowed = new Set((q.options ?? []).map((o) => o.value));
        if (!Array.isArray(raw) || raw.some((v) => typeof v !== 'string' || !allowed.has(v)))
          errors.push({ questionId: q.id, message: '정의된 보기들 중에서만 선택할 수 있습니다' });
        else value[q.id] = [...new Set(raw as string[])];
        break;
      }
      case 'text': {
        const max = TEXT_MAX[q.variant ?? 'short'];
        if (typeof raw !== 'string')
          errors.push({ questionId: q.id, message: '문자열이어야 합니다' });
        else if (raw.length > max)
          errors.push({ questionId: q.id, message: `${max}자 이내로 입력해 주세요` });
        else value[q.id] = raw.trim();
        break;
      }
      default:
        break;
    }
  }
  return { ok: errors.length === 0, errors, value };
}

/* ============================== 클라이언트 ============================== */

class NoActiveSurveyError extends Error {}

interface SubmitInput {
  answers: Record<string, AnswerValue>;
  respondent?: { userId?: string; email?: string };
  meta?: { pageUrl?: string; referrer?: string };
}

async function getActiveSurvey(
  endpoint: string,
  appId: string,
  apiToken: string | undefined,
  signal?: AbortSignal,
): Promise<SurveyDto> {
  const res = await fetch(
    `${endpoint.replace(/\/+$/, '')}/api/surveys/${encodeURIComponent(appId)}/active`,
    { headers: authHeaders(apiToken), signal },
  );
  if (res.status === 404) throw new NoActiveSurveyError();
  if (!res.ok) throw new Error(await errMessage(res));
  return res.json() as Promise<SurveyDto>;
}

async function submitResponse(
  endpoint: string,
  appId: string,
  apiToken: string | undefined,
  input: SubmitInput,
): Promise<{ id: string; surveyVersion: number }> {
  const res = await fetch(
    `${endpoint.replace(/\/+$/, '')}/api/surveys/${encodeURIComponent(appId)}/responses`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders(apiToken) },
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) throw new Error(await errMessage(res));
  return res.json() as Promise<{ id: string; surveyVersion: number }>;
}

function authHeaders(apiToken: string | undefined): Record<string, string> {
  const h: Record<string, string> = { 'x-surveydesk-widget': 'vendor-0.1.0' };
  if (apiToken) h.authorization = `Bearer ${apiToken}`;
  return h;
}
async function errMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: unknown; error?: unknown };
    const m = j.message ?? j.error;
    if (Array.isArray(m)) return m.join(', ');
    if (m) return String(m);
  } catch {
    /* ignore */
  }
  return `요청 실패 (${res.status})`;
}

/* ================================ 스타일 ================================ */

const STYLE_ID = 'surveydesk-widget-styles';
const ACCENT = '#2f5fe0';
const ACCENT_INK = '#ffffff';

function ensureStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.sd-root, .sd-root * { box-sizing: border-box; }
.sd-root {
  --sd-accent: ${ACCENT}; --sd-accent-ink: ${ACCENT_INK};
  --sd-ink:#1a1d23; --sd-ink-soft:#4a4f57; --sd-muted:#6b7280;
  --sd-surface:#fff; --sd-surface-2:#f4f5f7; --sd-border:#d7dae0; --sd-border-strong:#b7bcc6;
  --sd-danger:#b42318; --sd-success:#047857;
  --sd-radius:14px; --sd-radius-sm:9px;
  --sd-shadow:0 1px 2px rgba(16,24,40,.06),0 12px 32px -8px rgba(16,24,40,.22);
  --sd-z-launcher:2147483000; --sd-z-backdrop:2147483600; --sd-z-dialog:2147483601;
  --sd-ease:cubic-bezier(.22,1,.36,1);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:var(--sd-ink); line-height:1.5;
}
.sd-launcher{position:fixed;z-index:var(--sd-z-launcher);display:inline-flex;align-items:center;gap:8px;
  padding:12px 18px;border:0;border-radius:999px;background:var(--sd-accent);color:var(--sd-accent-ink);
  font:inherit;font-weight:600;font-size:14px;cursor:pointer;box-shadow:var(--sd-shadow);
  transition:transform .18s var(--sd-ease),filter .18s var(--sd-ease);}
.sd-launcher:hover{filter:brightness(1.06);transform:translateY(-1px);}
.sd-launcher:active{transform:translateY(0);}
.sd-launcher svg{width:18px;height:18px;display:block;}
.sd-pos-br{right:20px;bottom:20px;} .sd-pos-bl{left:20px;bottom:20px;}
.sd-pos-tr{right:20px;top:20px;} .sd-pos-tl{left:20px;top:20px;}
.sd-backdrop{position:fixed;inset:0;z-index:var(--sd-z-backdrop);background:rgba(16,24,40,.42);
  display:flex;align-items:flex-end;justify-content:flex-end;padding:20px;animation:sd-fade .16s var(--sd-ease);}
.sd-dialog{position:relative;z-index:var(--sd-z-dialog);width:min(420px,calc(100vw - 32px));
  max-height:min(640px,calc(100vh - 40px));display:flex;flex-direction:column;background:var(--sd-surface);
  color:var(--sd-ink);border-radius:var(--sd-radius);box-shadow:var(--sd-shadow);overflow:hidden;
  animation:sd-pop .2s var(--sd-ease);}
@media (max-width:520px){.sd-backdrop{padding:0;align-items:flex-end;justify-content:center;}
  .sd-dialog{width:100vw;max-height:92vh;border-radius:18px 18px 0 0;animation:sd-sheet .24s var(--sd-ease);}}
.sd-header{display:flex;align-items:flex-start;gap:12px;padding:18px 20px 12px;border-bottom:1px solid var(--sd-border);}
.sd-header-text{flex:1;min-width:0;}
.sd-title{margin:0;font-size:16px;font-weight:700;letter-spacing:-.01em;text-wrap:balance;}
.sd-intro{margin:6px 0 0;font-size:13px;color:var(--sd-ink-soft);}
.sd-close{flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;
  border:0;border-radius:8px;background:transparent;color:var(--sd-muted);cursor:pointer;
  transition:background .14s var(--sd-ease),color .14s var(--sd-ease);}
.sd-close:hover{background:var(--sd-surface-2);color:var(--sd-ink);} .sd-close svg{width:18px;height:18px;}
.sd-body{padding:16px 20px;overflow-y:auto;-webkit-overflow-scrolling:touch;}
.sd-footer{padding:14px 20px;border-top:1px solid var(--sd-border);display:flex;align-items:center;gap:10px;}
.sd-footer-spacer{flex:1;}
.sd-brand{font-size:11px;color:var(--sd-muted);text-decoration:none;} .sd-brand:hover{color:var(--sd-ink-soft);}
.sd-q{margin:0 0 22px;} .sd-q:last-child{margin-bottom:4px;}
.sd-q-label{display:block;font-size:14px;font-weight:600;margin-bottom:10px;color:var(--sd-ink);}
.sd-req{color:var(--sd-danger);margin-left:2px;}
.sd-q-error{margin:8px 0 0;font-size:12px;color:var(--sd-danger);}
.sd-stars{display:inline-flex;gap:4px;}
.sd-star{border:0;background:transparent;padding:2px;cursor:pointer;color:var(--sd-border-strong);line-height:0;
  border-radius:6px;transition:color .12s var(--sd-ease),transform .12s var(--sd-ease);}
.sd-star svg{width:30px;height:30px;} .sd-star:hover{transform:scale(1.08);}
.sd-star.sd-on,.sd-star[aria-checked="true"]{color:var(--sd-accent);}
.sd-nps{display:grid;grid-template-columns:repeat(11,1fr);gap:5px;}
.sd-nps-btn{border:1px solid var(--sd-border);background:var(--sd-surface);color:var(--sd-ink-soft);
  border-radius:8px;padding:8px 0;font:inherit;font-size:13px;font-weight:600;cursor:pointer;
  transition:background .12s var(--sd-ease),border-color .12s var(--sd-ease),color .12s var(--sd-ease);}
.sd-nps-btn:hover{border-color:var(--sd-border-strong);}
.sd-nps-btn[aria-pressed="true"]{background:var(--sd-accent);border-color:var(--sd-accent);color:var(--sd-accent-ink);}
.sd-nps-legend{display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--sd-muted);}
.sd-choices{display:flex;flex-direction:column;gap:8px;}
.sd-choice{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--sd-border);
  border-radius:var(--sd-radius-sm);cursor:pointer;font-size:14px;
  transition:border-color .12s var(--sd-ease),background .12s var(--sd-ease);}
.sd-choice:hover{border-color:var(--sd-border-strong);background:var(--sd-surface-2);}
.sd-choice.sd-checked{border-color:var(--sd-accent);background:color-mix(in srgb,var(--sd-accent) 8%,var(--sd-surface));}
.sd-choice input{accent-color:var(--sd-accent);width:17px;height:17px;margin:0;flex:none;}
.sd-choice span{flex:1;}
.sd-input,.sd-textarea{width:100%;border:1px solid var(--sd-border);border-radius:var(--sd-radius-sm);
  padding:10px 12px;font:inherit;font-size:14px;color:var(--sd-ink);background:var(--sd-surface);resize:vertical;
  transition:border-color .12s var(--sd-ease);}
.sd-textarea{min-height:88px;line-height:1.5;}
.sd-input::placeholder,.sd-textarea::placeholder{color:var(--sd-muted);}
.sd-input:hover,.sd-textarea:hover{border-color:var(--sd-border-strong);}
.sd-count{margin-top:4px;font-size:11px;color:var(--sd-muted);text-align:right;}
.sd-btn{appearance:none;border:1px solid transparent;border-radius:var(--sd-radius-sm);padding:10px 18px;
  font:inherit;font-weight:600;font-size:14px;cursor:pointer;
  transition:filter .14s var(--sd-ease),background .14s var(--sd-ease),border-color .14s var(--sd-ease);}
.sd-btn-primary{background:var(--sd-accent);color:var(--sd-accent-ink);}
.sd-btn-primary:hover:not(:disabled){filter:brightness(1.06);}
.sd-btn-ghost{background:transparent;color:var(--sd-ink-soft);border-color:var(--sd-border);}
.sd-btn-ghost:hover:not(:disabled){background:var(--sd-surface-2);}
.sd-btn:disabled{opacity:.55;cursor:not-allowed;}
.sd-state{padding:36px 24px;text-align:center;}
.sd-state-icon{width:52px;height:52px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;border-radius:50%;}
.sd-state-icon.sd-ok{background:color-mix(in srgb,var(--sd-success) 12%,var(--sd-surface));color:var(--sd-success);}
.sd-state-icon.sd-err{background:color-mix(in srgb,var(--sd-danger) 12%,var(--sd-surface));color:var(--sd-danger);}
.sd-state-icon svg{width:28px;height:28px;}
.sd-state-title{margin:0;font-size:16px;font-weight:700;}
.sd-state-text{margin:8px 0 0;font-size:13px;color:var(--sd-ink-soft);}
.sd-spinner{width:28px;height:28px;border:3px solid var(--sd-border);border-top-color:var(--sd-accent);
  border-radius:50%;margin:0 auto;animation:sd-spin .7s linear infinite;}
.sd-form-error{margin:0 0 14px;padding:10px 12px;
  border:1px solid color-mix(in srgb,var(--sd-danger) 35%,var(--sd-border));
  background:color-mix(in srgb,var(--sd-danger) 8%,var(--sd-surface));border-radius:var(--sd-radius-sm);
  font-size:13px;color:var(--sd-danger);}
.sd-root :focus{outline:none;}
.sd-root :focus-visible{outline:2px solid var(--sd-accent);outline-offset:2px;border-radius:6px;}
.sd-nps-btn:focus-visible,.sd-choice:focus-within,.sd-input:focus-visible,.sd-textarea:focus-visible{
  outline:2px solid var(--sd-accent);outline-offset:1px;}
@keyframes sd-fade{from{opacity:0}to{opacity:1}}
@keyframes sd-pop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
@keyframes sd-sheet{from{transform:translateY(100%)}to{transform:none}}
@keyframes sd-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){
  .sd-root *,.sd-backdrop,.sd-dialog,.sd-launcher,.sd-star,.sd-spinner{
    animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;}
  .sd-spinner{animation:sd-spin .9s linear infinite!important;}
}
`;

/* ================================ 아이콘 ================================ */

const ChatIcon = (): ReactElement => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-4 4v-4H6.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const CloseIcon = (): ReactElement => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const StarIcon = ({ filled }: { filled: boolean }): ReactElement => (
  <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
    <path
      d="m12 3 2.7 5.5 6 .9-4.35 4.24 1.03 6-5.38-2.83L6.62 19.6l1.03-6L3.3 9.4l6-.9L12 3Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);
const CheckIcon = (): ReactElement => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="m5 13 4 4L19 7"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const AlertIcon = (): ReactElement => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 8v5m0 3.5h.01M10.3 3.9 2.5 17.5A2 2 0 0 0 4.2 20.5h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ============================ 질문 렌더러 ============================ */

interface FieldProps {
  question: SurveyQuestion;
  value: AnswerValue | undefined;
  error?: string;
  onChange: (v: AnswerValue | undefined) => void;
}

function QuestionField({ question, value, error, onChange }: FieldProps): ReactElement {
  const labelId = useId();
  const errorId = useId();
  const describedBy = error ? errorId : undefined;
  return (
    <div className="sd-q" role="group" aria-labelledby={labelId}>
      <span className="sd-q-label" id={labelId}>
        {question.label}
        {question.required ? (
          <span className="sd-req" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      {renderBody(question, value, onChange, labelId, describedBy)}
      {error ? (
        <p className="sd-q-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function renderBody(
  question: SurveyQuestion,
  value: AnswerValue | undefined,
  onChange: (v: AnswerValue | undefined) => void,
  labelId: string,
  describedBy: string | undefined,
): ReactElement {
  switch (question.type) {
    case 'rating':
      return <Rating value={value} onChange={onChange} labelId={labelId} />;
    case 'nps':
      return <Nps value={value} onChange={onChange} labelId={labelId} describedBy={describedBy} />;
    case 'single_choice':
      return <SingleChoice question={question} value={value} onChange={onChange} />;
    case 'multi_choice':
      return <MultiChoice question={question} value={value} onChange={onChange} />;
    case 'text':
      return (
        <Text question={question} value={value} onChange={onChange} describedBy={describedBy} />
      );
    default:
      return <></>;
  }
}

function Rating({
  value,
  onChange,
  labelId,
}: {
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue | undefined) => void;
  labelId: string;
}): ReactElement {
  const current = typeof value === 'number' ? value : 0;
  const stars = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => RATING_MIN + i);
  const move = (d: number) =>
    onChange(Math.min(RATING_MAX, Math.max(RATING_MIN, (current || RATING_MIN) + d)));
  return (
    <div
      className="sd-stars"
      role="radiogroup"
      aria-labelledby={labelId}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          move(1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      {stars.map((n) => {
        const on = n <= current;
        return (
          <button
            key={n}
            type="button"
            className={`sd-star${on ? ' sd-on' : ''}`}
            role="radio"
            aria-checked={current === n}
            aria-label={`${n}점`}
            tabIndex={current === n || (current === 0 && n === RATING_MIN) ? 0 : -1}
            onClick={() => onChange(current === n ? undefined : n)}
          >
            <StarIcon filled={on} />
          </button>
        );
      })}
    </div>
  );
}

function Nps({
  value,
  onChange,
  labelId,
  describedBy,
}: {
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue | undefined) => void;
  labelId: string;
  describedBy: string | undefined;
}): ReactElement {
  const current = typeof value === 'number' ? value : null;
  const scale = Array.from({ length: NPS_MAX - NPS_MIN + 1 }, (_, i) => NPS_MIN + i);
  return (
    <div>
      <div className="sd-nps" role="group" aria-labelledby={labelId} aria-describedby={describedBy}>
        {scale.map((n) => (
          <button
            key={n}
            type="button"
            className="sd-nps-btn"
            aria-pressed={current === n}
            aria-label={`${n}점`}
            onClick={() => onChange(current === n ? undefined : n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="sd-nps-legend" aria-hidden="true">
        <span>전혀 아니다</span>
        <span>매우 그렇다</span>
      </div>
    </div>
  );
}

function SingleChoice({ question, value, onChange }: FieldProps): ReactElement {
  const name = useId();
  const current = typeof value === 'string' ? value : null;
  return (
    <div className="sd-choices" role="radiogroup">
      {(question.options ?? []).map((opt) => {
        const checked = current === opt.value;
        return (
          <label key={opt.value} className={`sd-choice${checked ? ' sd-checked' : ''}`}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={checked}
              onChange={() => onChange(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function MultiChoice({ question, value, onChange }: FieldProps): ReactElement {
  const selected = Array.isArray(value) ? (value as string[]) : [];
  const toggle = (v: string) => {
    const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
    onChange(next.length > 0 ? next : undefined);
  };
  return (
    <div className="sd-choices" role="group">
      {(question.options ?? []).map((opt) => {
        const checked = selected.includes(opt.value);
        return (
          <label key={opt.value} className={`sd-choice${checked ? ' sd-checked' : ''}`}>
            <input type="checkbox" checked={checked} onChange={() => toggle(opt.value)} />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function Text({
  question,
  value,
  onChange,
  describedBy,
}: FieldProps & { describedBy: string | undefined }): ReactElement {
  const variant = question.variant ?? 'short';
  const max = TEXT_MAX[variant];
  const text = typeof value === 'string' ? value : '';
  const set = (v: string) => onChange(v.length > 0 ? v : undefined);
  if (variant === 'long') {
    return (
      <div>
        <textarea
          className="sd-textarea"
          value={text}
          maxLength={max}
          aria-describedby={describedBy}
          placeholder="자유롭게 적어 주세요"
          onChange={(e) => set(e.target.value)}
        />
        <div className="sd-count" aria-hidden="true">
          {text.length}/{max}
        </div>
      </div>
    );
  }
  return (
    <input
      className="sd-input"
      type="text"
      value={text}
      maxLength={max}
      aria-describedby={describedBy}
      placeholder="한 줄로 적어 주세요"
      onChange={(e) => set(e.target.value)}
    />
  );
}

/* ============================== 위젯 본체 ============================== */

export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface FeedbackWidgetProps {
  appId: string;
  endpoint: string;
  apiToken?: string;
  position?: WidgetPosition;
  accent?: string;
  accentInk?: string;
  label?: string;
  respondent?: { userId?: string; email?: string };
  onSubmitted?: (receipt: { id: string; surveyVersion: number }) => void;
}

type Phase = 'idle' | 'loading' | 'ready' | 'submitting' | 'success' | 'load-error' | 'no-survey';

const POSITION_CLASS: Record<WidgetPosition, string> = {
  'bottom-right': 'sd-pos-br',
  'bottom-left': 'sd-pos-bl',
  'top-right': 'sd-pos-tr',
  'top-left': 'sd-pos-tl',
};
const FOCUSABLE =
  'a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function FeedbackWidget(props: FeedbackWidgetProps): ReactElement | null {
  const {
    appId,
    endpoint,
    apiToken,
    position = 'bottom-right',
    accent = ACCENT,
    accentInk = ACCENT_INK,
    label = '피드백',
    respondent,
    onSubmitted,
  } = props;

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [survey, setSurvey] = useState<SurveyDto | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue | undefined>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const titleId = useId();
  const introId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    ensureStyles();
  }, []);

  const load = useCallback(() => {
    const ctrl = new AbortController();
    setPhase('loading');
    setFormError(null);
    getActiveSurvey(endpoint, appId, apiToken, ctrl.signal)
      .then((s) => {
        setSurvey(s);
        setPhase('ready');
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setPhase(e instanceof NoActiveSurveyError ? 'no-survey' : 'load-error');
      });
    return ctrl;
  }, [endpoint, appId, apiToken]);

  const openDialog = useCallback(() => {
    setOpen(true);
    if (phase === 'idle' || phase === 'load-error') load();
  }, [phase, load]);

  const closeDialog = useCallback(() => {
    setOpen(false);
    if (phase === 'success') {
      setAnswers({});
      setErrors({});
      setPhase(survey ? 'ready' : 'idle');
    }
    launcherRef.current?.focus();
  }, [phase, survey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeDialog();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null || n === document.activeElement,
      );
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, closeDialog]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 20);
    return () => window.clearTimeout(t);
  }, [open, phase]);

  const setAnswer = useCallback((qid: string, v: AnswerValue | undefined) => {
    setAnswers((p) => ({ ...p, [qid]: v }));
    setErrors((p) => {
      if (!p[qid]) return p;
      const next = { ...p };
      delete next[qid];
      return next;
    });
  }, []);

  const submit = useCallback(() => {
    if (!survey) return;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(answers)) if (v !== undefined) cleaned[k] = v;
    const result = validateAnswers(survey.questions, cleaned);
    if (!result.ok) {
      const map: Record<string, string> = {};
      for (const err of result.errors) map[err.questionId] = err.message;
      setErrors(map);
      setFormError('입력을 확인해 주세요.');
      window.setTimeout(() => {
        dialogRef.current
          ?.querySelector<HTMLElement>('.sd-q-error')
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 0);
      return;
    }
    setPhase('submitting');
    setFormError(null);
    submitResponse(endpoint, appId, apiToken, {
      answers: result.value as Record<string, AnswerValue>,
      respondent,
      meta: {
        pageUrl: typeof location !== 'undefined' ? location.href : undefined,
        referrer:
          typeof document !== 'undefined' && document.referrer ? document.referrer : undefined,
      },
    })
      .then((receipt) => {
        setPhase('success');
        onSubmitted?.(receipt);
      })
      .catch((e: unknown) => {
        setPhase('ready');
        setFormError(e instanceof Error ? e.message : '제출에 실패했습니다.');
      });
  }, [survey, answers, endpoint, appId, apiToken, respondent, onSubmitted]);

  if (phase === 'no-survey') return null;

  const rootStyle: CSSProperties = {
    ['--sd-accent' as string]: accent,
    ['--sd-accent-ink' as string]: accentInk,
  };

  return (
    <div className="sd-root" style={rootStyle}>
      {!open ? (
        <button
          ref={launcherRef}
          type="button"
          className={`sd-launcher ${POSITION_CLASS[position]}`}
          aria-haspopup="dialog"
          onClick={openDialog}
        >
          <ChatIcon />
          {label}
        </button>
      ) : null}

      {open ? (
        <div
          className="sd-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDialog();
          }}
        >
          <div
            ref={dialogRef}
            className="sd-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={survey ? titleId : undefined}
            aria-describedby={survey?.intro ? introId : undefined}
            aria-label={survey ? undefined : '피드백'}
          >
            {phase === 'loading' ? (
              <div className="sd-state" aria-busy="true">
                <div className="sd-spinner" />
                <p className="sd-state-text" style={{ marginTop: 14 }}>
                  설문을 불러오는 중…
                </p>
              </div>
            ) : null}

            {phase === 'load-error' ? (
              <div className="sd-state">
                <div className="sd-state-icon sd-err">
                  <AlertIcon />
                </div>
                <h2 className="sd-state-title">설문을 불러오지 못했어요</h2>
                <p className="sd-state-text">네트워크 상태를 확인하고 다시 시도해 주세요.</p>
                <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button type="button" className="sd-btn sd-btn-ghost" onClick={closeDialog}>
                    닫기
                  </button>
                  <button type="button" className="sd-btn sd-btn-primary" onClick={() => load()}>
                    다시 시도
                  </button>
                </div>
              </div>
            ) : null}

            {phase === 'success' ? (
              <div className="sd-state" role="status">
                <div className="sd-state-icon sd-ok">
                  <CheckIcon />
                </div>
                <h2 className="sd-state-title">소중한 의견 감사합니다</h2>
                <p className="sd-state-text">보내 주신 피드백은 서비스 개선에 활용할게요.</p>
                <div style={{ marginTop: 18 }}>
                  <button type="button" className="sd-btn sd-btn-primary" onClick={closeDialog}>
                    닫기
                  </button>
                </div>
              </div>
            ) : null}

            {(phase === 'ready' || phase === 'submitting') && survey ? (
              <SurveyForm
                survey={survey}
                answers={answers}
                errors={errors}
                formError={formError}
                submitting={phase === 'submitting'}
                titleId={titleId}
                introId={introId}
                onAnswer={setAnswer}
                onClose={closeDialog}
                onSubmit={submit}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SurveyForm(props: {
  survey: SurveyDto;
  answers: Record<string, AnswerValue | undefined>;
  errors: Record<string, string>;
  formError: string | null;
  submitting: boolean;
  titleId: string;
  introId: string;
  onAnswer: (qid: string, v: AnswerValue | undefined) => void;
  onClose: () => void;
  onSubmit: () => void;
}): ReactElement {
  const {
    survey,
    answers,
    errors,
    formError,
    submitting,
    titleId,
    introId,
    onAnswer,
    onClose,
    onSubmit,
  } = props;
  return (
    <>
      <div className="sd-header">
        <div className="sd-header-text">
          <h2 className="sd-title" id={titleId}>
            {survey.title}
          </h2>
          {survey.intro ? (
            <p className="sd-intro" id={introId}>
              {survey.intro}
            </p>
          ) : null}
        </div>
        <button type="button" className="sd-close" aria-label="닫기" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      <form
        className="sd-body"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {formError ? (
          <p className="sd-form-error" role="alert">
            {formError}
          </p>
        ) : null}
        {survey.questions.map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.id]}
            error={errors[q.id]}
            onChange={(v) => onAnswer(q.id, v)}
          />
        ))}
        <button type="submit" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
      </form>

      <div className="sd-footer">
        <span className="sd-brand">SurveyDesk</span>
        <span className="sd-footer-spacer" />
        <button type="button" className="sd-btn sd-btn-ghost" onClick={onClose}>
          취소
        </button>
        <button
          type="button"
          className="sd-btn sd-btn-primary"
          disabled={submitting}
          onClick={onSubmit}
        >
          {submitting ? '제출 중…' : '제출'}
        </button>
      </div>
    </>
  );
}

export default FeedbackWidget;

// 일부 타입은 소비자가 재사용할 수 있도록 함께 내보냅니다.
export type { SurveyDto, SurveyQuestion, AnswerValue };
