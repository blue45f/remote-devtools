import { applyTextInputStyles } from "../styles";
import {
  DropdownOption,
  SimpleColumnData,
  SimpleStructuredSheetData,
} from "../types";
import { collectAllComponentOptions } from "../utils";

import { createCustomDropdown } from "./dropdown";

/**
 * Google Sheets 데이터를 기반으로 폼 필드 생성
 */
export function createFormFields(
  form: HTMLFormElement,
  sheetData: SimpleStructuredSheetData,
) {
  // 폼의 기본 submit 동작 방지 (엔터키로 인한 의도치 않은 submit 방지)
  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  // 담당자 관련 컬럼들을 찾아서 통합 (필드명이 변경될 수 있으므로 포함 검사)
  const assigneeColumn = sheetData.columns.find(
    (c) => c.header.includes("담당자") && !c.header.includes("QA"),
  );
  const qaAssigneeColumn = sheetData.columns.find((c) =>
    c.header.includes("QA 담당자"),
  );

  // 모든 컴포넌트 옵션을 카테고리별로 수집
  const componentCategories = collectAllComponentOptions(sheetData.columns);
  let componentFieldCreated = false;

  sheetData.columns
    .filter((c) => c.header)
    .forEach((column) => {
      // 담당자 관련 필드들을 하나로 통합 처리
      if (column.header.includes("담당자") && !column.header.includes("QA")) {
        createAssigneeField(form, assigneeColumn, qaAssigneeColumn);
        return;
      }

      // QA 담당자는 이미 담당자 필드에서 처리했으므로 스킵
      if (column.header.includes("QA 담당자")) {
        return;
      }

      // 컴포넌트 필드들은 통합 처리 - 첫 번째 컴포넌트 컬럼일 때만 생성
      if (column.header.includes("컴포넌트")) {
        if (!componentFieldCreated) {
          createUnifiedComponentField(form, componentCategories);
          componentFieldCreated = true;
        }
        return;
      }

      // 라벨/레이블 필드도 개별적으로 생성 (멀티 선택으로 처리)
      if (column.header === "라벨" || column.header === "레이블") {
        createLabelField(form, column);
        return;
      }

      const fieldContainer = document.createElement("div");
      fieldContainer.style.marginBottom = "16px";

      // 라벨 생성
      const label = document.createElement("label");
      // Epic 필드는 필수값으로 표시
      label.textContent = column.header;
      label.style.fontWeight = "bold";
      label.style.marginBottom = "8px";
      label.style.display = "block";
      label.style.color = "#333";
      label.style.fontSize = "14px";

      // title 필드는 text input, 나머지는 커스텀 드롭다운으로 생성
      if (column.header === "제목") {
        // title 필드는 text input으로 생성
        const input = document.createElement("input");
        input.type = "text";
        input.name = "title"; // 백엔드와 맞추기 위해 영어로 변경
        input.required = true;
        input.placeholder = `${column.header}를 입력하세요`;

        // title의 첫 번째 값을 기본값으로 설정
        if (column.values.length > 0) {
          input.value = column.values[0].text;
        }

        applyTextInputStyles(input);
        fieldContainer.appendChild(label);
        fieldContainer.appendChild(input);
      } else {
        // 나머지 필드는 커스텀 드롭다운으로 생성
        const dropdownOptions: DropdownOption[] = [];

        // 시트 데이터에서 옵션 생성
        if (column.values.length > 0) {
          column.values.forEach((cellValue) => {
            dropdownOptions.push({
              value: cellValue.text,
              label: cellValue.userData
                ? `${cellValue.text} (${cellValue.userData.userDisplayName})`
                : cellValue.text,
              userData: cellValue.userData,
            });
          });
        }

        // 커스텀 드롭다운 생성
        const dropdown = createCustomDropdown({
          name: column.header === "상위 Epic 티켓" ? "Epic" : column.header, // Epic 필드는 백엔드와 맞추기 위해 영어로 변경 (대문자 E)
          placeholder: `${column.header}를 선택하세요`,
          required: column.header === "상위 Epic 티켓",
          multiple: false,
          defaultValue:
            column.header === "상위 Epic 티켓" && column.values.length === 1
              ? column.values[0].text
              : undefined,
          options: dropdownOptions,
        });

        fieldContainer.appendChild(label);
        fieldContainer.appendChild(dropdown.container);
      }

      form.appendChild(fieldContainer);
    });
}

/**
 * 담당자 필드 생성 (담당자 + QA 담당자 통합)
 */
function createAssigneeField(
  form: HTMLFormElement,
  assigneeColumn?: SimpleColumnData,
  qaAssigneeColumn?: SimpleColumnData,
) {
  const fieldContainer = document.createElement("div");
  fieldContainer.style.marginBottom = "16px";

  // 라벨 생성
  const label = document.createElement("label");
  label.textContent = "담당자";
  label.style.fontWeight = "bold";
  label.style.marginBottom = "8px";
  label.style.display = "block";
  label.style.color = "#333";
  label.style.fontSize = "14px";

  // 드롭다운 옵션 준비
  const dropdownOptions: DropdownOption[] = [];

  // 일반 담당자 옵션 추가
  if (assigneeColumn && assigneeColumn.values.length > 0) {
    assigneeColumn.values.forEach((cellValue) => {
      dropdownOptions.push({
        value: cellValue.userData?.username || cellValue.text,
        label: cellValue.userData?.userDisplayName || cellValue.text,
        userData: cellValue.userData,
      });
    });
  }

  // QA 담당자 옵션 추가
  if (qaAssigneeColumn && qaAssigneeColumn.values.length > 0) {
    // QA 담당자 구분자 추가 (선택 불가)
    dropdownOptions.push({
      value: "",
      label: "QA 담당자",
      disabled: true,
    });

    // QA 담당자 옵션들
    qaAssigneeColumn.values.forEach((cellValue) => {
      dropdownOptions.push({
        value: cellValue.userData?.username || cellValue.text,
        label: cellValue.userData?.userDisplayName || cellValue.text,
        userData: cellValue.userData,
      });
    });
  }

  // 커스텀 드롭다운 생성
  const dropdown = createCustomDropdown({
    name: "assignee",
    placeholder: "담당자를 선택하세요",
    required: true,
    multiple: false,
    options: dropdownOptions,
  });

  fieldContainer.appendChild(label);
  fieldContainer.appendChild(dropdown.container);
  form.appendChild(fieldContainer);
}

/**
 * 통합된 컴포넌트 필드 생성 (멀티 선택 가능한 드롭다운)
 */
function createUnifiedComponentField(
  form: HTMLFormElement,
  componentCategories: Map<string, string[]>,
) {
  const fieldContainer = document.createElement("div");
  fieldContainer.style.marginBottom = "16px";

  // 라벨 생성
  const label = document.createElement("label");
  label.textContent = "컴포넌트";
  label.style.fontWeight = "bold";
  label.style.marginBottom = "8px";
  label.style.display = "block";
  label.style.color = "#333";
  label.style.fontSize = "14px";

  // 드롭다운 옵션 준비
  const dropdownOptions: DropdownOption[] = [];

  // 카테고리별로 옵션 추가 (서버 순서 유지)
  componentCategories.forEach((options, category) => {
    // 정렬하지 않고 원본 순서 유지
    options.forEach((option) => {
      dropdownOptions.push({
        value: option,
        label: option,
        category: category,
      });
    });
  });

  // 커스텀 드롭다운 생성
  const dropdown = createCustomDropdown({
    name: "components",
    placeholder: "컴포넌트를 선택하세요",
    required: false,
    multiple: true,
    options: dropdownOptions,
  });

  fieldContainer.appendChild(label);
  fieldContainer.appendChild(dropdown.container);
  form.appendChild(fieldContainer);
}

/**
 * 라벨/레이블 필드 생성 (멀티 선택)
 */
function createLabelField(form: HTMLFormElement, column: SimpleColumnData) {
  // 옵션이 없으면 필드를 생성하지 않음
  if (!column.values || column.values.length === 0) {
    return;
  }

  const fieldContainer = document.createElement("div");
  fieldContainer.style.marginBottom = "16px";

  // 라벨 생성
  const label = document.createElement("label");
  label.textContent = column.header;
  label.style.fontWeight = "bold";
  label.style.marginBottom = "8px";
  label.style.display = "block";
  label.style.color = "#333";
  label.style.fontSize = "14px";

  // 드롭다운 옵션 준비
  const dropdownOptions: DropdownOption[] = [];

  // 옵션 추가
  if (column.values.length > 0) {
    column.values.forEach((cellValue) => {
      dropdownOptions.push({
        value: cellValue.text,
        label: cellValue.text,
      });
    });
  }

  // 커스텀 드롭다운 생성
  const dropdown = createCustomDropdown({
    name: "labels",
    placeholder: `${column.header}을 선택하세요`,
    required: false,
    multiple: true,
    options: dropdownOptions,
  });

  fieldContainer.appendChild(label);
  fieldContainer.appendChild(dropdown.container);
  form.appendChild(fieldContainer);
}
