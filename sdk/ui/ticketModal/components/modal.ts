import { CommonInfo } from "../../../types/common";
import { loadTicketFormDataFromAPI } from "../api";
import { applyButtonStyles } from "../styles";
import { CreateTicketFunction } from "../types";

/**
 * QA 티켓 생성 모달을 생성
 */
export function createTicketModal(
  createTicketDirect: CreateTicketFunction,
  onCancel: () => void,
  commonInfo: CommonInfo | null,
) {
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
  modal.style.borderRadius = "8px";
  modal.style.maxWidth = "500px";
  modal.style.width = "90%";
  modal.style.maxHeight = "80vh";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  modal.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.2)";
  modal.style.position = "relative";

  // 헤더 컨테이너
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.padding = "24px 24px 0";
  header.style.position = "sticky";
  header.style.top = "0";
  header.style.backgroundColor = "#fff";
  header.style.zIndex = "10";
  header.style.borderTopLeftRadius = "8px";
  header.style.borderTopRightRadius = "8px";
  header.style.marginBottom = "0";

  // 제목
  const title = document.createElement("h2");
  title.textContent = "QA 티켓 생성";
  title.style.margin = "0";
  title.style.fontSize = "20px";
  title.style.fontWeight = "bold";
  title.style.color = "#333";

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
  loadingDiv.style.color = "#666";
  loadingDiv.textContent = "폼 데이터를 불러오는 중...";

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
  buttonContainer.style.borderTop = "1px solid #e5e7eb";
  buttonContainer.style.backgroundColor = "#fff";
  buttonContainer.style.borderBottomLeftRadius = "8px";
  buttonContainer.style.borderBottomRightRadius = "8px";
  buttonContainer.style.marginTop = "0";

  // 취소 버튼
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "취소";
  applyButtonStyles(cancelButton, "secondary");

  // 생성 버튼
  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.textContent = "티켓 생성";
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
