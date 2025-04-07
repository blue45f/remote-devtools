/**
 * 안내 모달 생성
 */
export function createGuideModal(onClose: () => void) {
  // 모달 오버레이
  const overlay = document.createElement("div");
  overlay.setAttribute("data-remote-debugger-overlay", "true");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  overlay.style.zIndex = "10000";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  // 모달 컨테이너
  const modal = document.createElement("div");
  modal.style.backgroundColor = "#fff";
  modal.style.borderRadius = "12px";
  modal.style.maxWidth = "600px";
  modal.style.width = "90%";
  modal.style.maxHeight = "80vh";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  modal.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.3)";
  modal.style.position = "relative";
  modal.style.animation = "fadeIn 0.3s ease-out";

  // 애니메이션 스타일 추가
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `;
  document.head.appendChild(style);

  // 헤더 컨테이너
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.padding = "24px";
  header.style.borderBottom = "1px solid #e5e7eb";
  header.style.backgroundColor = "#f9fafb";
  header.style.borderTopLeftRadius = "12px";
  header.style.borderTopRightRadius = "12px";

  // 제목
  const title = document.createElement("h2");
  title.textContent = "🎯 사용 가이드";
  title.style.margin = "0";
  title.style.fontSize = "22px";
  title.style.fontWeight = "bold";
  title.style.color = "#1f2937";

  // 닫기 버튼
  const closeButton = document.createElement("button");
  closeButton.innerHTML = "✕";
  closeButton.style.background = "none";
  closeButton.style.border = "none";
  closeButton.style.fontSize = "24px";
  closeButton.style.cursor = "pointer";
  closeButton.style.padding = "4px 8px";
  closeButton.style.borderRadius = "4px";
  closeButton.style.color = "#6b7280";
  closeButton.style.transition = "all 0.2s";

  closeButton.addEventListener("mouseenter", () => {
    closeButton.style.backgroundColor = "#e5e7eb";
    closeButton.style.color = "#1f2937";
  });
  closeButton.addEventListener("mouseleave", () => {
    closeButton.style.backgroundColor = "transparent";
    closeButton.style.color = "#6b7280";
  });

  header.appendChild(title);
  header.appendChild(closeButton);

  // 콘텐츠 영역
  const content = document.createElement("div");
  content.style.padding = "24px";
  content.style.overflowY = "auto";
  content.style.flex = "1";

  // 안내 내용
  content.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px;">
        <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 16px;">❓ 원격 디버깅 툴이란?</h3>
        <p style="margin: 0; color: #1e293b; line-height: 1.6;">
          웹 페이지의 문제를 실시간으로 기록하고 공유할 수 있는 도구입니다. 팀 간 효율적인 협업을 도와줍니다.
        </p>  
        <p style="margin: 8px 0 0 0; color: #1e293b; line-height: 1.6;">
          더 자세한 가이드는 프로젝트 문서를 참고해주세요.
        </p>
      </div>

      <div style="background: #fefce8; border-left: 4px solid #facc15; padding: 16px; border-radius: 4px;">
        <h3 style="margin: 0 0 12px 0; color: #713f12; font-size: 16px;">📌 주요 기능</h3>
        <ul style="margin: 0; padding-left: 20px; color: #1e293b; line-height: 1.8;">
            <li><strong>이슈 티켓 만들기:</strong> 녹화 세션, 앱 정보 등을 포함한 티켓을 바로 생성합니다. (추가 설정 필요)</li>    
            <li><strong>녹화 시작:</strong> 네트워크 기록을 원격으로 저장하고, URL을 복사합니다</li>  
            <li><strong>라이브 세션:</strong> 실시간으로 화면을 공유합니다</li>
            <li><strong>네트워크 모킹:</strong> API 응답을 원하는 값으로 조작해 다양한 시나리오를 테스트합니다</li>
        </ul>
        <hr style="margin: 12px 0 12px 0" />
        <p style="margin: 0; color: #1e293b; line-height: 1.6;">
        녹화 세션, 생성된 티켓의 URL을 메신저로 공유할 수 있습니다.
      </div>
    </div>
  `;

  // 하단 버튼 영역
  const footer = document.createElement("div");
  footer.style.padding = "16px 24px";
  footer.style.borderTop = "1px solid #e5e7eb";
  footer.style.display = "flex";
  footer.style.justifyContent = "center";

  const confirmButton = document.createElement("button");
  confirmButton.textContent = "확인";
  confirmButton.style.padding = "10px 24px";
  confirmButton.style.backgroundColor = "#3b82f6";
  confirmButton.style.color = "#fff";
  confirmButton.style.border = "none";
  confirmButton.style.borderRadius = "6px";
  confirmButton.style.cursor = "pointer";
  confirmButton.style.fontSize = "14px";
  confirmButton.style.fontWeight = "500";
  confirmButton.style.transition = "background-color 0.2s";

  confirmButton.addEventListener("mouseenter", () => {
    confirmButton.style.backgroundColor = "#2563eb";
  });
  confirmButton.addEventListener("mouseleave", () => {
    confirmButton.style.backgroundColor = "#3b82f6";
  });

  footer.appendChild(confirmButton);

  // 이벤트 핸들러
  const handleClose = () => {
    document.body.removeChild(overlay);
    onClose();
  };

  closeButton.addEventListener("click", handleClose);
  confirmButton.addEventListener("click", handleClose);

  // 오버레이 클릭 시 닫기
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      handleClose();
    }
  });

  // ESC 키로 닫기
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
      document.removeEventListener("keydown", handleEsc);
    }
  };
  document.addEventListener("keydown", handleEsc);

  // DOM 구성
  modal.appendChild(header);
  modal.appendChild(content);
  modal.appendChild(footer);
  overlay.appendChild(modal);

  return overlay;
}
