import { buildShareLink } from '../utils/helpers';

import { tokens, injectKeyframeAnimations } from './theme';

type ToastVariant = 'primary' | 'default' | 'danger';

/**
 * Create recording toast UI.
 *
 * Layout:  [●] 녹화 중 · 세션 #N    [ 열기 ] [ 링크 복사 ] [ 중지 ]
 *
 * - "열기" (primary) opens the session view in a new tab — a RECORDED session
 *   opens its dashboard detail page (replay/network/console), a LIVE session
 *   opens the Chrome DevTools tabbed view. (see helpers.buildShareLink)
 * - "링크 복사" copies that same link with inline feedback.
 * - "중지" ends the session.
 */
export const createRecordingToast = (onClickDisconnect: () => void) => {
  injectKeyframeAnimations();

  const toast = document.createElement('div');
  // Announce recording state + copy result to assistive tech.
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  Object.assign(toast.style, {
    backgroundColor: tokens.color.bg.surface,
    border: `1px solid ${tokens.color.border.subtle}`,
    color: tokens.color.text.secondary,
    padding: '10px 14px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'opacity 0.3s ease',
    fontSize: '13px',
    fontFamily: tokens.font.system,
    boxShadow: tokens.shadow.sm,
  });

  // Pulsing green dot
  const dot = document.createElement('span');
  Object.assign(dot.style, {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: tokens.color.accent.green,
    boxShadow: `0 0 6px rgba(34, 197, 94, 0.5)`,
    animation: 'rdtPulseDot 2s infinite',
    flexShrink: '0',
  });
  toast.appendChild(dot);

  // Label group: title + session id badge.
  const labelGroup = document.createElement('div');
  Object.assign(labelGroup.style, {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: '1.25',
    marginRight: '4px',
  });

  const title = document.createElement('span');
  title.textContent = '녹화 중';
  title.style.color = tokens.color.text.primary;
  title.style.fontWeight = '600';
  labelGroup.appendChild(title);

  const sessionBadge = document.createElement('span');
  Object.assign(sessionBadge.style, {
    fontSize: '11px',
    color: tokens.color.text.muted,
  });
  labelGroup.appendChild(sessionBadge);
  toast.appendChild(labelGroup);

  const openButton = createToastButton('열기', 'primary');
  openButton.setAttribute('aria-label', '세션 보기 (새 탭에서 열기)');
  toast.appendChild(openButton);

  const copyButton = createToastButton('링크 복사');
  copyButton.setAttribute('aria-label', '세션 링크 복사');
  toast.appendChild(copyButton);

  const disconnectButton = createToastButton('중지', 'danger');
  disconnectButton.setAttribute('aria-label', '녹화 중지');
  disconnectButton.addEventListener('click', onClickDisconnect);
  toast.appendChild(disconnectButton);

  // Lazily-resolved getters, wired by updateRoomInfo.
  let resolveRoom: () => string | null = () => null;
  let resolveRecordId: () => number | null = () => null;
  let copyResetTimer: ReturnType<typeof setTimeout> | null = null;

  const currentLink = (): string | null => {
    const roomName = resolveRoom();
    if (!roomName) return null;
    return buildShareLink(roomName, resolveRecordId());
  };

  const flashCopyLabel = (label: string) => {
    copyButton.textContent = label;
    if (copyResetTimer) clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => {
      copyButton.textContent = '링크 복사';
      copyResetTimer = null;
    }, 2000);
  };

  openButton.onclick = () => {
    const url = currentLink();
    if (!url) return;
    globalThis.open(url, '_blank', 'noopener,noreferrer');
  };

  copyButton.onclick = async () => {
    const url = currentLink();
    if (!url) {
      flashCopyLabel('세션 정보 없음');
      return;
    }

    try {
      // Prefer the async Clipboard API; fall back to execCommand when it is
      // absent OR rejects (denied permission / cross-origin iframe / Safari).
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        flashCopyLabel('복사됨!');
        return;
      }
      throw new Error('clipboard API unavailable');
    } catch {
      const ok = legacyCopy(url);
      if (ok) {
        flashCopyLabel('복사됨!');
      } else {
        // Last resort: surface the link so the user can copy it manually.
        copyButton.title = url;
        flashCopyLabel('복사 실패 — 링크가 버튼 위에 표시됩니다');
      }
    }
  };

  return {
    element: toast,
    updateRoomInfo: ({
      type,
      getRoomName,
      getRecordId,
    }: {
      type: 'live' | 'record';
      getRoomName: () => string | null;
      getRecordId: () => number | null;
    }) => {
      resolveRoom = getRoomName;
      resolveRecordId = getRecordId;

      title.textContent = type === 'record' ? '녹화 중' : '라이브 세션';
      const recordId = getRecordId();
      sessionBadge.textContent = recordId ? `세션 #${recordId}` : '연결됨';
      // Reflect the destination in the Open button's tooltip.
      openButton.title = recordId ? '세션 상세 보기' : 'DevTools 열기';
      copyButton.textContent = '링크 복사';
    },
  };
};

function createToastButton(text: string, variant: ToastVariant = 'default'): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;

  const baseStyles: Partial<CSSStyleDeclaration> = {
    backgroundColor: tokens.color.bg.hover,
    border: `1px solid ${tokens.color.border.medium}`,
    color: tokens.color.text.secondary,
    borderRadius: '6px',
    cursor: 'pointer',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    fontFamily: tokens.font.system,
    transition: `all ${tokens.transition.fast}`,
    outline: 'none',
    whiteSpace: 'nowrap',
    minHeight: '30px',
  };

  if (variant === 'danger') {
    baseStyles.borderColor = 'rgba(239, 68, 68, 0.3)';
    baseStyles.color = '#f87171';
  } else if (variant === 'primary') {
    // Filled accent — the clear primary action.
    baseStyles.background = 'linear-gradient(135deg, #8b5cf6, #6366f1)';
    baseStyles.borderColor = 'rgba(139, 92, 246, 0.35)';
    baseStyles.color = '#ffffff';
    baseStyles.fontWeight = '600';
  }

  Object.assign(button.style, baseStyles);

  button.addEventListener('mouseenter', () => {
    if (variant === 'danger') {
      button.style.backgroundColor = tokens.color.accent.redDim;
    } else if (variant === 'primary') {
      button.style.filter = 'brightness(1.08)';
    } else {
      button.style.backgroundColor = tokens.color.bg.active;
      button.style.color = tokens.color.text.primary;
    }
  });
  button.addEventListener('mouseleave', () => {
    if (variant === 'primary') {
      button.style.filter = 'none';
      return;
    }
    button.style.backgroundColor = tokens.color.bg.hover;
    button.style.color = variant === 'danger' ? '#f87171' : tokens.color.text.secondary;
  });

  return button;
}

/** Legacy clipboard fallback for non-secure contexts (LAN IP, http). */
function legacyCopy(text: string): boolean {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textArea);
    return ok;
  } catch {
    return false;
  }
}
