import { CustomDropdownConfig, DropdownOption } from "../types";

/**
 * 재사용 가능한 커스텀 드롭다운 생성
 */
export function createCustomDropdown(config: CustomDropdownConfig): {
  container: HTMLDivElement;
  getValue: () => string | string[];
  setValue: (value: string | string[]) => void;
} {
  const {
    name,
    placeholder = "선택하세요",
    required = false,
    multiple = false,
    defaultValue,
    options,
  } = config;

  // 커스텀 드롭다운 컨테이너
  const dropdownContainer = document.createElement("div");
  dropdownContainer.style.position = "relative";
  dropdownContainer.style.width = "100%";

  // 선택된 값들을 표시하는 버튼 (드롭다운 트리거)
  const dropdownButton = document.createElement("button");
  dropdownButton.type = "button";
  dropdownButton.style.width = "100%";
  dropdownButton.style.padding = "8px 32px 8px 12px";
  dropdownButton.style.border = "1px solid #ddd";
  dropdownButton.style.borderRadius = "4px";
  dropdownButton.style.backgroundColor = "#fff";
  dropdownButton.style.textAlign = "left";
  dropdownButton.style.fontSize = "14px";
  dropdownButton.style.color = "#333";
  dropdownButton.style.cursor = "pointer";
  dropdownButton.style.minHeight = "40px";
  dropdownButton.style.lineHeight = "1.5";
  dropdownButton.style.position = "relative";
  dropdownButton.style.overflow = "hidden";
  dropdownButton.style.textOverflow = "ellipsis";
  dropdownButton.style.whiteSpace = "nowrap";
  dropdownButton.textContent = placeholder;

  // 드롭다운 아이콘
  const dropdownIcon = document.createElement("span");
  dropdownIcon.innerHTML = "▼";
  dropdownIcon.style.position = "absolute";
  dropdownIcon.style.right = "12px";
  dropdownIcon.style.top = "50%";
  dropdownIcon.style.transform = "translateY(-50%)";
  dropdownIcon.style.fontSize = "12px";
  dropdownIcon.style.pointerEvents = "none";
  dropdownButton.appendChild(dropdownIcon);

  // 바텀시트 오버레이
  const bottomSheetOverlay = document.createElement("div");
  bottomSheetOverlay.style.position = "fixed";
  bottomSheetOverlay.style.top = "0";
  bottomSheetOverlay.style.left = "0";
  bottomSheetOverlay.style.right = "0";
  bottomSheetOverlay.style.bottom = "0";
  bottomSheetOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  bottomSheetOverlay.style.zIndex = "10001";
  bottomSheetOverlay.style.display = "none";
  bottomSheetOverlay.style.opacity = "0";
  bottomSheetOverlay.style.transition = "opacity 0.3s ease";

  // 바텀시트 컨테이너
  const bottomSheet = document.createElement("div");
  bottomSheet.style.position = "fixed";
  bottomSheet.style.left = "0";
  bottomSheet.style.right = "0";
  bottomSheet.style.bottom = "0";
  bottomSheet.style.backgroundColor = "#fff";
  bottomSheet.style.borderTopLeftRadius = "16px";
  bottomSheet.style.borderTopRightRadius = "16px";
  bottomSheet.style.boxShadow = "0 -4px 12px rgba(0, 0, 0, 0.15)";
  bottomSheet.style.zIndex = "10002";
  bottomSheet.style.maxHeight = "70vh";
  bottomSheet.style.display = "flex";
  bottomSheet.style.flexDirection = "column";
  bottomSheet.style.transform = "translateY(100%)";
  bottomSheet.style.transition = "transform 0.3s ease";

  // 바텀시트 헤더
  const bottomSheetHeader = document.createElement("div");
  bottomSheetHeader.style.padding = "16px 20px";
  bottomSheetHeader.style.borderBottom = "1px solid #e5e7eb";
  bottomSheetHeader.style.display = "flex";
  bottomSheetHeader.style.justifyContent = "space-between";
  bottomSheetHeader.style.alignItems = "center";

  // 헤더 타이틀
  const headerTitle = document.createElement("h3");
  headerTitle.textContent =
    name === "assignee"
      ? "담당자 선택"
      : name === "components"
        ? "컴포넌트 선택"
        : `${name} 선택`;
  headerTitle.style.margin = "0";
  headerTitle.style.fontSize = "16px";
  headerTitle.style.fontWeight = "bold";
  headerTitle.style.color = "#333";

  // 닫기 버튼
  const closeButton = document.createElement("button");
  closeButton.innerHTML = "✕";
  closeButton.style.background = "none";
  closeButton.style.border = "none";
  closeButton.style.fontSize = "20px";
  closeButton.style.cursor = "pointer";
  closeButton.style.color = "#666";
  closeButton.style.padding = "4px 8px";

  bottomSheetHeader.appendChild(headerTitle);
  bottomSheetHeader.appendChild(closeButton);

  // 바텀시트 콘텐츠 (스크롤 가능)
  const bottomSheetContent = document.createElement("div");
  bottomSheetContent.style.flex = "1";
  bottomSheetContent.style.overflowY = "auto";
  bottomSheetContent.style.padding = "8px 0";

  // 바텀시트 푸터 (멀티 선택일 경우)
  const bottomSheetFooter = document.createElement("div");
  bottomSheetFooter.style.padding = "16px 20px";
  bottomSheetFooter.style.borderTop = "1px solid #e5e7eb";
  bottomSheetFooter.style.display = multiple ? "block" : "none";

  const confirmButton = document.createElement("button");
  confirmButton.textContent = "확인";
  confirmButton.style.width = "100%";
  confirmButton.style.padding = "12px";
  confirmButton.style.backgroundColor = "#007bff";
  confirmButton.style.color = "#fff";
  confirmButton.style.border = "none";
  confirmButton.style.borderRadius = "8px";
  confirmButton.style.fontSize = "16px";
  confirmButton.style.fontWeight = "bold";
  confirmButton.style.cursor = "pointer";

  bottomSheetFooter.appendChild(confirmButton);

  // 바텀시트 구성
  bottomSheet.appendChild(bottomSheetHeader);
  bottomSheet.appendChild(bottomSheetContent);
  bottomSheet.appendChild(bottomSheetFooter);
  bottomSheetOverlay.appendChild(bottomSheet);

  // Hidden input to store selected value(s)
  const hiddenInput = document.createElement("input");
  hiddenInput.type = "hidden";
  hiddenInput.name = name;
  hiddenInput.value = "";
  if (required) {
    hiddenInput.required = true;
  }

  // 선택된 값 관리
  let selectedValue: string | Set<string> = multiple ? new Set<string>() : "";
  let tempSelectedValue: string | Set<string> = multiple
    ? new Set<string>()
    : "";

  // 기본값 설정
  if (defaultValue) {
    if (multiple && Array.isArray(defaultValue)) {
      selectedValue = new Set(defaultValue);
      tempSelectedValue = new Set(defaultValue);
      hiddenInput.value = defaultValue.join(",");
    } else if (!multiple && typeof defaultValue === "string") {
      selectedValue = defaultValue;
      tempSelectedValue = defaultValue;
      hiddenInput.value = defaultValue;
    }
  }

  // 버튼 텍스트 업데이트 함수
  const updateButtonText = () => {
    if (multiple) {
      const selected = Array.from(selectedValue as Set<string>);
      if (selected.length === 0) {
        dropdownButton.textContent = placeholder;
        dropdownButton.appendChild(dropdownIcon);
        hiddenInput.value = "";
      } else {
        // 선택된 옵션의 라벨 찾기
        const selectedLabels = selected.map((val) => {
          const option = options.find((opt) => opt.value === val);
          return option ? option.label : val;
        });
        dropdownButton.textContent = selectedLabels.join(", ");
        dropdownButton.appendChild(dropdownIcon);
        hiddenInput.value = selected.join(",");
      }
    } else {
      const value = selectedValue as string;
      if (!value) {
        dropdownButton.textContent = placeholder;
        dropdownButton.appendChild(dropdownIcon);
        hiddenInput.value = "";
      } else {
        const option = options.find((opt) => opt.value === value);
        dropdownButton.textContent = option ? option.label : value;
        dropdownButton.appendChild(dropdownIcon);
        hiddenInput.value = value;
      }
    }

    // 커스텀 이벤트 발생 (폼 유효성 검사 트리거)
    const customEvent = new Event("customValueChange", { bubbles: true });
    hiddenInput.dispatchEvent(customEvent);
  };

  // 카테고리별로 옵션 그룹화 (원본 순서 유지)
  // 카테고리가 없는 옵션들은 순서를 유지하기 위해 별도 처리
  const optionsByCategory = new Map<string | undefined, DropdownOption[]>();
  const insertionOrder: (string | undefined)[] = [];

  options.forEach((option) => {
    const category = option.category;
    if (!optionsByCategory.has(category)) {
      optionsByCategory.set(category, []);
      insertionOrder.push(category);
    }
    const categoryOptions = optionsByCategory.get(category);
    if (categoryOptions) {
      categoryOptions.push(option);
    }
  });

  // 바텀시트에 옵션 추가
  const renderOptions = () => {
    bottomSheetContent.innerHTML = "";

    // 원본 순서대로 렌더링
    insertionOrder.forEach((category) => {
      const categoryOptions = optionsByCategory.get(category) || [];
      // 카테고리 헤더가 있는 경우에만 표시
      if (category) {
        const categoryHeader = document.createElement("div");
        categoryHeader.textContent = category;
        categoryHeader.style.padding = "12px 20px 8px";
        categoryHeader.style.fontWeight = "bold";
        categoryHeader.style.color = "#666";
        categoryHeader.style.backgroundColor = "#f8f9fa";
        categoryHeader.style.fontSize = "13px";
        categoryHeader.style.zIndex = "1";
        bottomSheetContent.appendChild(categoryHeader);
      }

      // 옵션들 추가
      categoryOptions.forEach((option) => {
        const optionItem = document.createElement("div");
        optionItem.style.padding = "14px 20px";
        optionItem.style.cursor = option.disabled ? "default" : "pointer";
        optionItem.style.fontSize = "15px";
        optionItem.style.color = option.disabled ? "#999" : "#333";
        optionItem.style.display = "flex";
        optionItem.style.alignItems = "center";
        optionItem.style.gap = "12px";
        optionItem.style.transition = "background-color 0.2s";

        if (option.disabled) {
          optionItem.style.fontWeight = "bold";
          optionItem.style.backgroundColor = "#f3f4f6";
          optionItem.textContent = option.label;
          bottomSheetContent.appendChild(optionItem);
          return;
        }

        if (multiple) {
          // 멀티 선택: 체크박스 포함
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = option.value;
          checkbox.style.width = "20px";
          checkbox.style.height = "20px";
          checkbox.style.margin = "0";
          checkbox.style.cursor = "pointer";
          checkbox.checked = (tempSelectedValue as Set<string>).has(
            option.value,
          );

          const optionLabel = document.createElement("span");
          optionLabel.textContent = option.label;
          optionLabel.style.flex = "1";

          optionItem.appendChild(checkbox);
          optionItem.appendChild(optionLabel);

          // 클릭 이벤트
          const handleClick = (e: Event) => {
            // 체크박스를 직접 클릭한 경우는 이미 체크 상태가 변경되므로
            // 다시 토글하지 않음
            if (e.target !== checkbox) {
              checkbox.checked = !checkbox.checked;
            }

            if (checkbox.checked) {
              (tempSelectedValue as Set<string>).add(option.value);
            } else {
              (tempSelectedValue as Set<string>).delete(option.value);
            }
          };

          // optionItem 전체 클릭 이벤트
          optionItem.addEventListener("click", handleClick);

          // 체크박스 클릭 이벤트 (이벤트 전파 방지하고 상태만 업데이트)
          checkbox.addEventListener("click", (e: Event) => {
            e.stopPropagation();
            handleClick(e);
          });
        } else {
          // 단일 선택
          const radioButton = document.createElement("div");
          radioButton.style.width = "20px";
          radioButton.style.height = "20px";
          radioButton.style.borderRadius = "50%";
          radioButton.style.border = "2px solid #ddd";
          radioButton.style.position = "relative";

          if (tempSelectedValue === option.value) {
            radioButton.style.borderColor = "#007bff";
            const inner = document.createElement("div");
            inner.style.position = "absolute";
            inner.style.top = "50%";
            inner.style.left = "50%";
            inner.style.transform = "translate(-50%, -50%)";
            inner.style.width = "10px";
            inner.style.height = "10px";
            inner.style.borderRadius = "50%";
            inner.style.backgroundColor = "#007bff";
            radioButton.appendChild(inner);
          }

          const optionLabel = document.createElement("span");
          optionLabel.textContent = option.label;
          optionLabel.style.flex = "1";

          optionItem.appendChild(radioButton);
          optionItem.appendChild(optionLabel);

          // 클릭 이벤트 (단일 선택은 즉시 적용)
          optionItem.addEventListener("click", () => {
            selectedValue = option.value;
            tempSelectedValue = option.value;
            updateButtonText();
            closeBottomSheet();
          });
        }

        // 호버 효과
        if (!option.disabled) {
          optionItem.addEventListener("mouseenter", () => {
            optionItem.style.backgroundColor = "#f3f4f6";
          });
          optionItem.addEventListener("mouseleave", () => {
            optionItem.style.backgroundColor = "transparent";
          });
        }

        bottomSheetContent.appendChild(optionItem);
      });
    });
  };

  // 바텀시트 열기/닫기
  const openBottomSheet = () => {
    // 임시 선택값 초기화
    if (multiple) {
      tempSelectedValue = new Set(selectedValue as Set<string>);
    } else {
      tempSelectedValue = selectedValue;
    }

    renderOptions();
    document.body.appendChild(bottomSheetOverlay);

    // 애니메이션을 위한 타이밍
    setTimeout(() => {
      bottomSheetOverlay.style.display = "block";
      setTimeout(() => {
        bottomSheetOverlay.style.opacity = "1";
        bottomSheet.style.transform = "translateY(0)";
      }, 10);
    }, 10);
  };

  const closeBottomSheet = () => {
    bottomSheetOverlay.style.opacity = "0";
    bottomSheet.style.transform = "translateY(100%)";

    setTimeout(() => {
      bottomSheetOverlay.style.display = "none";
      if (document.body.contains(bottomSheetOverlay)) {
        document.body.removeChild(bottomSheetOverlay);
      }
    }, 300);
  };

  // 이벤트 핸들러
  dropdownButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openBottomSheet();
  });

  closeButton.addEventListener("click", () => {
    closeBottomSheet();
  });

  bottomSheetOverlay.addEventListener("click", (e) => {
    if (e.target === bottomSheetOverlay) {
      closeBottomSheet();
    }
  });

  // 멀티 선택 확인 버튼
  if (multiple) {
    confirmButton.addEventListener("click", () => {
      selectedValue = new Set(tempSelectedValue as Set<string>);
      updateButtonText();
      closeBottomSheet();
    });
  }

  // 포커스 스타일
  dropdownButton.addEventListener("focus", () => {
    dropdownButton.style.borderColor = "#007bff";
    dropdownButton.style.outline = "none";
    dropdownButton.style.boxShadow = "0 0 0 2px rgba(0, 123, 255, 0.25)";
  });

  dropdownButton.addEventListener("blur", () => {
    dropdownButton.style.borderColor = "#ddd";
    dropdownButton.style.boxShadow = "none";
  });

  // DOM 구성
  dropdownContainer.appendChild(dropdownButton);
  dropdownContainer.appendChild(hiddenInput);

  // 초기 버튼 텍스트 설정
  updateButtonText();

  // 초기값이 있을 경우 validation 트리거
  if (defaultValue) {
    setTimeout(() => {
      const customEvent = new Event("customValueChange", { bubbles: true });
      hiddenInput.dispatchEvent(customEvent);
    }, 0);
  }

  // 값 가져오기/설정하기 메서드
  const getValue = () => {
    return multiple
      ? Array.from(selectedValue as Set<string>)
      : (selectedValue as string);
  };

  const setValue = (value: string | string[]) => {
    if (multiple && Array.isArray(value)) {
      selectedValue = new Set(value);
      tempSelectedValue = new Set(value);
    } else if (!multiple && typeof value === "string") {
      selectedValue = value;
      tempSelectedValue = value;
    }
    updateButtonText();
  };

  return {
    container: dropdownContainer,
    getValue,
    setValue,
  };
}
