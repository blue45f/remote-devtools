import { tokens } from "../../theme";
import { TicketTemplate, CustomDropdownConfig } from "../types";

import { createCustomDropdown } from "./dropdown";

/**
 * Create template selector UI (prevents duplicate creation)
 */
export function createTemplateSelector(
  container: HTMLElement,
  ticketTemplateList: TicketTemplate[],
  selectedTemplate: TicketTemplate | undefined,
  onTemplateChange: (templateName: string) => void,
): Element | null {
  if (ticketTemplateList.length <= 1) {
    return null;
  }

  const existingSelectors = document.querySelectorAll(
    ".template-selector-container",
  );
  if (existingSelectors.length > 0) {
    existingSelectors.forEach((selector) => selector.remove());
  }

  const selectorContainer = document.createElement("div");
  selectorContainer.className = "template-selector-container";
  selectorContainer.style.cssText = `
    margin: 0 0 24px 0;
    padding: 0;
    background: transparent;
    position: relative;
  `;

  const label = document.createElement("label");
  label.textContent = "Template *";
  label.style.cssText = `
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: ${tokens.color.text.muted};
    font-size: 13px;
    line-height: 1.5;
    font-family: ${tokens.font.system};
    text-transform: uppercase;
    letter-spacing: 0.03em;
  `;

  const templateOptions = ticketTemplateList.map((template) => ({
    value: template.name,
    label: template.name,
    data: template,
  }));

  const dropdownConfig: CustomDropdownConfig = {
    name: "template",
    placeholder: "Select a template",
    required: true,
    multiple: false,
    defaultValue: selectedTemplate?.name,
    options: templateOptions,
  };

  let customDropdown;
  try {
    customDropdown = createCustomDropdown(dropdownConfig);
    customDropdown.container.className = "template-selector-dropdown";
  } catch (error) {
    console.error("[RemoteDebug-SDK] customDropdown creation failed:", error);
    throw new Error(`Template selector creation failed: ${error}`);
  }

  const hiddenInput = customDropdown.container.querySelector(
    'input[type="hidden"]',
  ) as HTMLInputElement;

  if (hiddenInput) {
    let lastProcessedValue = hiddenInput.value;

    hiddenInput.addEventListener("customValueChange", async (event) => {
      const target = event.target as HTMLInputElement;
      const newValue = target.value;

      if (newValue === lastProcessedValue || !newValue) {
        return;
      }

      lastProcessedValue = newValue;

      try {
        await onTemplateChange(newValue);
      } catch (error) {
        console.error("[RemoteDebug-SDK] onTemplateChange failed:", error);
        lastProcessedValue = target.value;
      }
    });
  } else {
    console.error("[RemoteDebug-SDK] hiddenInput not found!");
  }

  selectorContainer.appendChild(label);
  selectorContainer.appendChild(customDropdown.container);

  let inserted = false;

  const formElement = container.querySelector("form");
  if (formElement && formElement.parentElement) {
    formElement.parentElement.insertBefore(selectorContainer, formElement);
    inserted = true;
  }

  if (!inserted && container.tagName === "FORM") {
    container.insertBefore(selectorContainer, container.firstChild);
    inserted = true;
  }

  if (!inserted) {
    container.insertBefore(selectorContainer, container.firstChild);
    inserted = true;
  }

  return customDropdown.container;
}

/**
 * Update existing template selector display
 */
export function updateTemplateSelection(templateName: string): void {
  const dropdownContainer = document.querySelector(
    ".template-selector-dropdown",
  );

  if (dropdownContainer) {
    const displayButton = dropdownContainer.querySelector("button");

    if (displayButton) {
      const textNodes = Array.from(displayButton.childNodes).filter(
        (node) => node.nodeType === Node.TEXT_NODE,
      );
      if (textNodes.length > 0) {
        textNodes[0].textContent = templateName;
      } else {
        displayButton.prepend(document.createTextNode(templateName));
      }
    }
  }
}

/**
 * Reload form with new template (with loading state)
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
    updateTemplateSelection(templateName);

    const tempLoadingDiv = document.createElement("div");
    tempLoadingDiv.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(24, 24, 27, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      border-radius: ${tokens.radius.md};
    `;
    tempLoadingDiv.innerHTML = `
      <div style="text-align: center; font-family: ${tokens.font.system};">
        <div style="margin-bottom: 8px; font-weight: 600; color: ${tokens.color.text.primary};">Switching template...</div>
        <div style="font-size: 12px; color: ${tokens.color.text.dim};">${templateName}</div>
      </div>
    `;

    form.style.position = "relative";
    form.appendChild(tempLoadingDiv);

    const newFormData = await getTicketFormDataByTemplate(
      deviceId,
      templateName,
    );

    if (!newFormData) {
      throw new Error(`Could not load data for template '${templateName}'.`);
    }

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

    createFormFields(form, newFormData);

    if (tempLoadingDiv.parentElement) {
      tempLoadingDiv.parentElement.removeChild(tempLoadingDiv);
    }
  } catch (error) {
    console.error("[RemoteDebug-SDK] Template change failed:", error);

    loadingDiv.innerHTML = `
      <div style="color: ${tokens.color.accent.red}; padding: 20px; text-align: center; font-family: ${tokens.font.system};">
        <p style="color: ${tokens.color.text.secondary};">An error occurred while switching templates.</p>
        <p style="color: ${tokens.color.text.dim};">Error: ${error instanceof Error ? error.message : String(error)}</p>
        <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: ${tokens.color.bg.hover}; border: 1px solid ${tokens.color.border.medium}; color: ${tokens.color.text.secondary}; border-radius: ${tokens.radius.sm}; cursor: pointer;">
          Reload
        </button>
      </div>
    `;
  }
}
