import { CommonInfo } from "../../../types/common";
import { loadTicketFormDataFromAPI } from "../api";
import { applyButtonStyles } from "../styles";
import {
  tokens,
  applyModalOverlayStyles,
  applyModalContainerStyles,
  injectKeyframeAnimations,
} from "../../theme";
import { CreateTicketFunction } from "../types";

/**
 * QA 티켓 생성 모달을 생성
 */
export function createTicketModal(
  createTicketDirect: CreateTicketFunction,
  onCancel: () => void,
  commonInfo: CommonInfo | null,
) {
  // Inject keyframe animations
  injectKeyframeAnimations();

  // 모달 오버레이
  const overlay = document.createElement("div");
  overlay.setAttribute("data-remote-debugger-overlay", "true");
  applyModalOverlayStyles(overlay);

  // 모달 컨테이너
  const modal = document.createElement("div");
  applyModalContainerStyles(modal, { maxWidth: "520px" });

  // 헤더 컨테이너
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.padding = "20px 24px 0";
  header.style.position = "sticky";
  header.style.top = "0";
  header.style.backgroundColor = "transparent";
  header.style.zIndex = "10";
  header.style.borderTopLeftRadius = "8px";
  header.style.borderTopRightRadius = "8px";
  header.style.marginBottom = "0";
  header.style.borderBottom = "none";

  // 제목
  const title = document.createElement("h2");
  title.textContent = "Create Ticket";
  title.style.margin = "0";
  title.style.fontSize = "18px";
  title.style.fontWeight = "600";
  title.style.color = "#f4f4f5";

  header.appendChild(title);

  // 스크롤 가능한 콘텐츠 영역
  const scrollableContent = document.createElement("div");
  scrollableContent.style.flex = "1";
  scrollableContent.style.overflowY = "auto";
  scrollableContent.style.padding = "0 24px 24px";
  scrollableContent.style.marginTop = "20px";

  // 로딩 상태 표시
  const loadingDiv = document.createElement("div");
  loadingDiv.style.textAlign = "center";
  loadingDiv.style.padding = "40px";
  loadingDiv.style.color = "#71717a";
  loadingDiv.textContent = "Loading form data...";

  // 폼 (초기에는 숨김)
  const form = document.createElement("form");
  form.style.display = "none";
  form.style.flexDirection = "column";
  form.style.gap = "16px";

  // 버튼 컨테이너
  const buttonContainer = document.createElement("div");
  buttonContainer.style.display = "flex";
  buttonContainer.style.gap = "12px";
  buttonContainer.style.justifyContent = "flex-end";
  buttonContainer.style.padding = "16px 24px";
  buttonContainer.style.borderTop = "1px solid #27272a";
  buttonContainer.style.backgroundColor = "#18181b";
  buttonContainer.style.borderBottomLeftRadius = "8px";
  buttonContainer.style.borderBottomRightRadius = "8px";
  buttonContainer.style.marginTop = "0";

  // 취소 버튼
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  applyButtonStyles(cancelButton, "secondary");

  // 생성 버튼
  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.textContent = "Create Ticket";
  applyButtonStyles(submitButton, "primary");

  // 취소 버튼 이벤트
  cancelButton.addEventListener("click", () => {
    document.body.removeChild(overlay);
    onCancel();
  });

  // 오버레이 클릭 시 모달 닫기
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
      onCancel();
    }
  });

  // 초기 DOM 구성 - 취소 버튼을 왼쪽, 생성 버튼을 오른쪽에 배치
  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(submitButton);

  // 스크롤 가능한 콘텐츠 영역에 로딩과 폼 추가
  scrollableContent.appendChild(loadingDiv);
  scrollableContent.appendChild(form);

  // 모달에 헤더, 콘텐츠, 버튼 추가
  modal.appendChild(header);
  modal.appendChild(scrollableContent);
  modal.appendChild(buttonContainer);
  overlay.appendChild(modal);

  // REST API로 Google Sheets 데이터를 가져와서 폼 생성
  loadTicketFormDataFromAPI({
    commonInfo,
    form,
    loadingDiv,
    cancelButton,
    submitButton,
    createTicketDirect,
  });

  return overlay;
}
