import { TicketTemplate, CustomDropdownConfig } from "../types";

import { createCustomDropdown } from "./dropdown";

// DOM 기반 중복 방지 (상태 플래그 없이 매번 DOM 체크)

/**
 * 템플릿 선택 UI 생성 (중복 생성 방지)
 */
export function createTemplateSelector(
  container: HTMLElement,
  ticketTemplateList: TicketTemplate[],
  selectedTemplate: TicketTemplate | undefined,
  onTemplateChange: (templateName: string) => void,
): Element | null {
  // 템플릿이 1개뿐이면 선택기 생성하지 않음
  if (ticketTemplateList.length <= 1) {
    return null;
  }

  // DOM 기반 중복 방지: 기존 선택기가 있으면 제거 후 새로 생성
  const existingSelectors = document.querySelectorAll(
    ".template-selector-container",
  );
  if (existingSelectors.length > 0) {
    existingSelectors.forEach((selector) => selector.remove());
  }

  // 세련된 템플릿 선택 컨테이너 생성
  const selectorContainer = document.createElement("div");
  selectorContainer.className = "template-selector-container";
  selectorContainer.style.cssText = `
    margin: 0 0 24px 0;
    padding: 0;
    background: transparent;
    position: relative;
  `;

  // 라벨 생성 (다른 필드들과 동일한 스타일)
  const label = document.createElement("label");
  label.textContent = "템플릿 선택 *";
  label.style.cssText = `
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #374151;
    font-size: 14px;
    line-height: 1.5;
  `;

  // 템플릿을 DropdownOption 형식으로 변환
  const templateOptions = ticketTemplateList.map((template) => ({
    value: template.name,
    label: template.name,
    data: template, // 추가 정보 저장
  }));

  // 커스텀 드롭다운 설정
  const dropdownConfig: CustomDropdownConfig = {
    name: "템플릿",
    placeholder: "템플릿을 선택하세요",
    required: true,
    multiple: false,
    defaultValue: selectedTemplate?.name,
    options: templateOptions,
  };

  let customDropdown;
  try {
    customDropdown = createCustomDropdown(dropdownConfig);

    // 클래스명 추가
    customDropdown.container.className = "template-selector-dropdown";
  } catch (error) {
    console.error("[RemoteDebug-SDK] customDropdown 생성 실패:", error);
    throw new Error(`템플릿 선택기 생성 실패: ${error}`);
  }

  // 값 변경 감지를 위한 MutationObserver (더 안정적)
  const hiddenInput = customDropdown.container.querySelector(
    'input[type="hidden"]',
  ) as HTMLInputElement;

  if (hiddenInput) {
    // 마지막 처리된 값 추적 (중복 처리 방지)
    let lastProcessedValue = hiddenInput.value;

    // customValueChange 커스텀 이벤트 감지 (가장 안정적)
    hiddenInput.addEventListener("customValueChange", async (event) => {
      const target = event.target as HTMLInputElement;
      const newValue = target.value;

      // 중복 처리 방지: 같은 값이면 무시
      if (newValue === lastProcessedValue || !newValue) {
        return;
      }

      // 현재 값을 마지막 처리값으로 설정
      lastProcessedValue = newValue;

      // 콜백 호출 (try-catch로 안전하게)
      try {
        await onTemplateChange(newValue);
      } catch (error) {
        console.error("[RemoteDebug-SDK]  onTemplateChange 호출 실패:", error);
        // 실패 시 마지막 처리값 되돌리기
        lastProcessedValue = target.value; // 혹은 이전 값으로
      }
    });
  } else {
    console.error("[RemoteDebug-SDK]  hiddenInput을 찾을 수 없습니다!");
  }

  // selectorContainer에 요소들 추가
  selectorContainer.appendChild(label);
  selectorContainer.appendChild(customDropdown.container);

  // 모달 제목 아래, 폼 위에 삽입 (여러 위치 시도)
  let inserted = false;

  // 1. form 바로 앞에 삽입 시도
  const formElement = container.querySelector("form");
  if (formElement && formElement.parentElement) {
    formElement.parentElement.insertBefore(selectorContainer, formElement);
    inserted = true;
  }

  // 2. form 내부 첫 번째에 삽입 시도
  if (!inserted && container.tagName === "FORM") {
    container.insertBefore(selectorContainer, container.firstChild);
    inserted = true;
  }

  // 3. container 첫 번째에 삽입 시도
  if (!inserted) {
    container.insertBefore(selectorContainer, container.firstChild);
    inserted = true;
  }

  // customDropdown 컨테이너를 반환
  return customDropdown.container;
}

/**
 * 기존 템플릿 선택기의 선택 상태 업데이트 (customDropdown용)
 */
export function updateTemplateSelection(templateName: string): void {
  const dropdownContainer = document.querySelector(
    ".template-selector-dropdown",
  );

  if (dropdownContainer) {
    const displayButton = dropdownContainer.querySelector("button");

    if (displayButton) {
      // 버튼 텍스트만 업데이트 (hiddenInput.value는 건드리지 않음)
      const textNodes = Array.from(displayButton.childNodes).filter(
        (node) => node.nodeType === Node.TEXT_NODE,
      );
      if (textNodes.length > 0) {
        textNodes[0].textContent = templateName;
      } else {
        // 텍스트 노드가 없으면 새로 생성
        displayButton.prepend(document.createTextNode(templateName));
      }
    }
  }
}

/**
 * 템플릿 변경 시 폼 다시 로드 (로딩 상태 표시 포함)
 */
export async function reloadFormWithTemplate(
  deviceId: string,
  templateName: string,
  form: HTMLFormElement,
  loadingDiv: HTMLElement,
  getTicketFormDataByTemplate: (
    deviceId: string,
    templateName: string,
  ) => Promise<any>,
  createFormFields: (form: HTMLFormElement, data: any) => void,
): Promise<void> {
  try {
    // 템플릿 선택기의 디스플레이만 업데이트 (값은 건드리지 않음)
    updateTemplateSelection(templateName);

    // 간단한 로딩 상태 표시 (기존 폼은 유지하면서)
    const tempLoadingDiv = document.createElement("div");
    tempLoadingDiv.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      border-radius: 8px;
    `;
    tempLoadingDiv.innerHTML = `
      <div style="text-align: center;">
        <div style="margin-bottom: 8px; font-weight: 600;">템플릿 변경 중...</div>
        <div style="font-size: 12px; color: #666;">${templateName}</div>
      </div>
    `;

    form.style.position = "relative";
    form.appendChild(tempLoadingDiv);

    // 새 템플릿 데이터 조회
    const newFormData = await getTicketFormDataByTemplate(
      deviceId,
      templateName,
    );

    if (!newFormData) {
      throw new Error(`템플릿 '${templateName}' 데이터를 불러올 수 없습니다.`);
    }

    // 기존 폼 필드 제거 (템플릿 선택기와 로딩 div는 유지)
    const fieldsToRemove = form.querySelectorAll(
      "*:not(.template-selector-container)",
    );
    fieldsToRemove.forEach((field) => {
      if (
        !field.classList.contains("template-selector-container") &&
        field !== tempLoadingDiv
      ) {
        field.remove();
      }
    });

    // 새 폼 필드 생성
    createFormFields(form, newFormData);

    // 로딩 오버레이 제거
    if (tempLoadingDiv.parentElement) {
      tempLoadingDiv.parentElement.removeChild(tempLoadingDiv);
    }
  } catch (error) {
    console.error("[RemoteDebug-SDK] 템플릿 변경 실패:", error);

    // 에러 처리
    loadingDiv.innerHTML = `
      <div style="color: red; padding: 20px; text-align: center;">
        <p>템플릿 변경 중 오류가 발생했습니다.</p>
        <p>오류: ${error instanceof Error ? error.message : String(error)}</p>
        <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px;">
          새로고침
        </button>
      </div>
    `;
  }
}
