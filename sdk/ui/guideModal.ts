import {
  tokens,
  applyModalOverlayStyles,
  applyModalContainerStyles,
  applyButtonStyles,
  injectKeyframeAnimations,
} from './theme';

/**
 * Create guide modal
 */
export function createGuideModal(onClose: () => void) {
  injectKeyframeAnimations();

  const overlay = document.createElement('div');
  overlay.setAttribute('data-remote-debugger-overlay', 'true');
  applyModalOverlayStyles(overlay);

  const modal = document.createElement('div');
  applyModalContainerStyles(modal, { maxWidth: '560px' });

  // Header
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: `1px solid ${tokens.color.border.subtle}`,
  });

  const title = document.createElement('h2');
  title.textContent = '빠른 가이드';
  Object.assign(title.style, {
    margin: '0',
    fontSize: '18px',
    fontWeight: '600',
    color: tokens.color.text.primary,
    fontFamily: tokens.font.system,
  });

  const closeButton = document.createElement('button');
  closeButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  Object.assign(closeButton.style, {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: tokens.radius.sm,
    color: tokens.color.text.dim,
    transition: `all ${tokens.transition.fast}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });
  closeButton.addEventListener('mouseenter', () => {
    closeButton.style.backgroundColor = tokens.color.bg.hover;
    closeButton.style.color = tokens.color.text.primary;
  });
  closeButton.addEventListener('mouseleave', () => {
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.color = tokens.color.text.dim;
  });

  header.appendChild(title);
  header.appendChild(closeButton);

  // Content
  const content = document.createElement('div');
  Object.assign(content.style, {
    padding: '24px',
    overflowY: 'auto',
    flex: '1',
  });

  content.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px; font-family: ${tokens.font.system};">
      <div style="background: ${tokens.color.bg.elevated}; border-left: 3px solid ${tokens.color.accent.violet}; padding: 16px; border-radius: ${tokens.radius.sm};">
        <h3 style="margin: 0 0 8px 0; color: #c4b5fd; font-size: 14px; font-weight: 600;">이 도구는 무엇인가요?</h3>
        <p style="margin: 0; color: ${tokens.color.text.muted}; line-height: 1.6; font-size: 13px;">
          웹 페이지의 문제를 실시간으로 기록하고 공유하는 원격 디버깅 도구입니다. 팀 간 협업을 효율적으로 돕습니다.
        </p>
        <p style="margin: 8px 0 0 0; color: ${tokens.color.text.dim}; line-height: 1.6; font-size: 13px;">
          자세한 사용법은 프로젝트 문서를 참고하세요.
        </p>
      </div>

      <div style="background: ${tokens.color.bg.elevated}; border-left: 3px solid ${tokens.color.accent.amber}; padding: 16px; border-radius: ${tokens.radius.sm};">
        <h3 style="margin: 0 0 12px 0; color: #fcd34d; font-size: 14px; font-weight: 600;">주요 기능</h3>
        <ul style="margin: 0; padding-left: 20px; color: ${tokens.color.text.muted}; line-height: 2; font-size: 13px;">
          <li><strong style="color: ${tokens.color.text.secondary};">티켓 생성:</strong> 녹화 세션과 기기 정보를 담아 이슈 티켓을 생성합니다. (설정 필요)</li>
          <li><strong style="color: ${tokens.color.text.secondary};">녹화 시작:</strong> 네트워크·콘솔·DOM 활동을 원격으로 캡처·저장한 뒤 URL로 공유합니다.</li>
          <li><strong style="color: ${tokens.color.text.secondary};">네트워크 리라이트:</strong> API 응답을 가로채 수정하며 다양한 시나리오를 테스트합니다.</li>
        </ul>
        <hr style="margin: 12px 0; border: none; border-top: 1px solid ${tokens.color.border.subtle};" />
        <p style="margin: 0; color: ${tokens.color.text.dim}; line-height: 1.6; font-size: 13px;">
          녹화 세션 또는 티켓 URL을 메신저로 팀과 공유하세요.
        </p>
      </div>
    </div>
  `;

  // Footer
  const footer = document.createElement('div');
  Object.assign(footer.style, {
    padding: '16px 24px',
    borderTop: `1px solid ${tokens.color.border.subtle}`,
    display: 'flex',
    justifyContent: 'center',
  });

  const confirmButton = document.createElement('button');
  confirmButton.textContent = '확인';
  applyButtonStyles(confirmButton, 'primary');
  confirmButton.style.padding = '10px 24px';

  footer.appendChild(confirmButton);

  // Event handlers. The Escape handler is declared first so handleClose can
  // always remove it, regardless of how the modal is dismissed (button /
  // overlay click / Escape) — otherwise it leaks on the host document.
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  const handleClose = () => {
    document.removeEventListener('keydown', handleEsc);
    if (overlay.parentElement) {
      overlay.parentElement.removeChild(overlay);
    }
    onClose();
  };

  closeButton.addEventListener('click', handleClose);
  confirmButton.addEventListener('click', handleClose);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      handleClose();
    }
  });

  document.addEventListener('keydown', handleEsc);

  modal.appendChild(header);
  modal.appendChild(content);
  modal.appendChild(footer);
  overlay.appendChild(modal);

  return overlay;
}
