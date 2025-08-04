import { tokens } from "../../theme";
import { applyTextInputStyles } from "../styles";
import {
  DropdownOption,
  SimpleColumnData,
  SimpleStructuredSheetData,
} from "../types";
import { collectAllComponentOptions } from "../utils";

import { createCustomDropdown } from "./dropdown";

/**
 * Create form fields from sheet data
 */
export function createFormFields(
  form: HTMLFormElement,
  sheetData: SimpleStructuredSheetData,
) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  const assigneeColumn = sheetData.columns.find(
    (c) => c.header.includes("담당자") && !c.header.includes("QA"),
  );
  const qaAssigneeColumn = sheetData.columns.find((c) =>
    c.header.includes("QA 담당자"),
  );

  const componentCategories = collectAllComponentOptions(sheetData.columns);
  let componentFieldCreated = false;

  sheetData.columns
    .filter((c) => c.header)
    .forEach((column) => {
      if (column.header.includes("담당자") && !column.header.includes("QA")) {
        createAssigneeField(form, assigneeColumn, qaAssigneeColumn);
        return;
      }

      if (column.header.includes("QA 담당자")) {
        return;
      }

      if (column.header.includes("컴포넌트")) {
        if (!componentFieldCreated) {
          createUnifiedComponentField(form, componentCategories);
          componentFieldCreated = true;
        }
        return;
      }

      if (column.header === "라벨" || column.header === "레이블") {
        createLabelField(form, column);
        return;
      }

      const fieldContainer = document.createElement("div");
      fieldContainer.style.marginBottom = "16px";

      const label = document.createElement("label");
      label.textContent = column.header;
      Object.assign(label.style, {
        fontWeight: "600",
        marginBottom: "8px",
        display: "block",
        color: tokens.color.text.muted,
        fontSize: "13px",
        fontFamily: tokens.font.system,
        textTransform: "uppercase" as const,
        letterSpacing: "0.03em",
      });

      if (column.header === "제목") {
        const input = document.createElement("input");
        input.type = "text";
        input.name = "title";
        input.required = true;
        input.placeholder = `Enter ${column.header}`;

        if (column.values.length > 0) {
          input.value = column.values[0].text;
        }

        applyTextInputStyles(input);
        fieldContainer.appendChild(label);
        fieldContainer.appendChild(input);
      } else {
        const dropdownOptions: DropdownOption[] = [];

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

        const dropdown = createCustomDropdown({
          name: column.header === "상위 Epic 티켓" ? "Epic" : column.header,
          placeholder: `Select ${column.header}`,
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
 * Create assignee field (merged assignee + QA assignee)
 */
function createAssigneeField(
  form: HTMLFormElement,
  assigneeColumn?: SimpleColumnData,
  qaAssigneeColumn?: SimpleColumnData,
) {
  const fieldContainer = document.createElement("div");
  fieldContainer.style.marginBottom = "16px";

  const label = document.createElement("label");
  label.textContent = "Assignee";
  Object.assign(label.style, {
    fontWeight: "600",
    marginBottom: "8px",
    display: "block",
    color: tokens.color.text.muted,
    fontSize: "13px",
    fontFamily: tokens.font.system,
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
  });

  const dropdownOptions: DropdownOption[] = [];

  if (assigneeColumn && assigneeColumn.values.length > 0) {
    assigneeColumn.values.forEach((cellValue) => {
      dropdownOptions.push({
        value: cellValue.userData?.username || cellValue.text,
        label: cellValue.userData?.userDisplayName || cellValue.text,
        userData: cellValue.userData,
      });
    });
  }

  if (qaAssigneeColumn && qaAssigneeColumn.values.length > 0) {
    dropdownOptions.push({
      value: "",
      label: "QA Assignees",
      disabled: true,
    });

    qaAssigneeColumn.values.forEach((cellValue) => {
      dropdownOptions.push({
        value: cellValue.userData?.username || cellValue.text,
        label: cellValue.userData?.userDisplayName || cellValue.text,
        userData: cellValue.userData,
      });
    });
  }

  const dropdown = createCustomDropdown({
    name: "assignee",
    placeholder: "Select an assignee",
    required: true,
    multiple: false,
    options: dropdownOptions,
  });

  fieldContainer.appendChild(label);
  fieldContainer.appendChild(dropdown.container);
  form.appendChild(fieldContainer);
}

/**
 * Create unified component field (multi-select dropdown)
 */
function createUnifiedComponentField(
  form: HTMLFormElement,
  componentCategories: Map<string, string[]>,
) {
  const fieldContainer = document.createElement("div");
  fieldContainer.style.marginBottom = "16px";

  const label = document.createElement("label");
  label.textContent = "Component";
  Object.assign(label.style, {
    fontWeight: "600",
    marginBottom: "8px",
    display: "block",
    color: tokens.color.text.muted,
    fontSize: "13px",
    fontFamily: tokens.font.system,
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
  });

  const dropdownOptions: DropdownOption[] = [];

  componentCategories.forEach((options, category) => {
    options.forEach((option) => {
      dropdownOptions.push({
        value: option,
        label: option,
        category: category,
      });
    });
  });

  const dropdown = createCustomDropdown({
    name: "components",
    placeholder: "Select components",
    required: false,
    multiple: true,
    options: dropdownOptions,
  });

  fieldContainer.appendChild(label);
  fieldContainer.appendChild(dropdown.container);
  form.appendChild(fieldContainer);
}

/**
 * Create label field (multi-select)
 */
function createLabelField(form: HTMLFormElement, column: SimpleColumnData) {
  if (!column.values || column.values.length === 0) {
    return;
  }

  const fieldContainer = document.createElement("div");
  fieldContainer.style.marginBottom = "16px";

  const label = document.createElement("label");
  label.textContent = column.header;
  Object.assign(label.style, {
    fontWeight: "600",
    marginBottom: "8px",
    display: "block",
    color: tokens.color.text.muted,
    fontSize: "13px",
    fontFamily: tokens.font.system,
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
  });

  const dropdownOptions: DropdownOption[] = [];

  if (column.values.length > 0) {
    column.values.forEach((cellValue) => {
      dropdownOptions.push({
        value: cellValue.text,
        label: cellValue.text,
      });
    });
  }

  const dropdown = createCustomDropdown({
    name: "labels",
    placeholder: `Select ${column.header}`,
    required: false,
    multiple: true,
    options: dropdownOptions,
  });

  fieldContainer.appendChild(label);
  fieldContainer.appendChild(dropdown.container);
  form.appendChild(fieldContainer);
}
