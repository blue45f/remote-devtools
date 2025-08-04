import { tokens } from "../../theme";
import { CustomDropdownConfig, DropdownOption } from "../types";

/**
 * Reusable custom dropdown with dark-themed bottom sheet
 */
export function createCustomDropdown(config: CustomDropdownConfig): {
  container: HTMLDivElement;
  getValue: () => string | string[];
  setValue: (value: string | string[]) => void;
} {
  const {
    name,
    placeholder = "Select...",
    required = false,
    multiple = false,
    defaultValue,
    options,
  } = config;

  // Custom dropdown container
  const dropdownContainer = document.createElement("div");
  dropdownContainer.style.position = "relative";
  dropdownContainer.style.width = "100%";

  // Button that displays selected value(s) (dropdown trigger)
  const dropdownButton = document.createElement("button");
  dropdownButton.type = "button";
  dropdownButton.style.width = "100%";
  dropdownButton.style.padding = "8px 32px 8px 12px";
  dropdownButton.style.border = `1px solid ${tokens.color.border.medium}`;
  dropdownButton.style.borderRadius = tokens.radius.sm;
  dropdownButton.style.backgroundColor = tokens.color.bg.elevated;
  dropdownButton.style.textAlign = "left";
  dropdownButton.style.fontSize = "14px";
  dropdownButton.style.fontFamily = tokens.font.system;
  dropdownButton.style.color = tokens.color.text.secondary;
  dropdownButton.style.cursor = "pointer";
  dropdownButton.style.minHeight = "40px";
  dropdownButton.style.lineHeight = "1.5";
  dropdownButton.style.position = "relative";
  dropdownButton.style.overflow = "hidden";
  dropdownButton.style.textOverflow = "ellipsis";
  dropdownButton.style.whiteSpace = "nowrap";
  dropdownButton.style.transition = `border-color ${tokens.transition.fast}, box-shadow ${tokens.transition.fast}`;
  dropdownButton.style.outline = "none";
  dropdownButton.textContent = placeholder;

  // Dropdown icon
  const dropdownIcon = document.createElement("span");
  dropdownIcon.innerHTML = "&#9662;";
  dropdownIcon.style.position = "absolute";
  dropdownIcon.style.right = "12px";
  dropdownIcon.style.top = "50%";
  dropdownIcon.style.transform = "translateY(-50%)";
  dropdownIcon.style.fontSize = "12px";
  dropdownIcon.style.color = tokens.color.text.dim;
  dropdownIcon.style.pointerEvents = "none";
  dropdownButton.appendChild(dropdownIcon);

  // Bottom sheet overlay
  const bottomSheetOverlay = document.createElement("div");
  bottomSheetOverlay.style.position = "fixed";
  bottomSheetOverlay.style.top = "0";
  bottomSheetOverlay.style.left = "0";
  bottomSheetOverlay.style.right = "0";
  bottomSheetOverlay.style.bottom = "0";
  bottomSheetOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
  bottomSheetOverlay.style.zIndex = tokens.zIndex.dropdown;
  bottomSheetOverlay.style.display = "none";
  bottomSheetOverlay.style.opacity = "0";
  bottomSheetOverlay.style.transition = "opacity 0.3s ease";

  // Bottom sheet container
  const bottomSheet = document.createElement("div");
  bottomSheet.style.position = "fixed";
  bottomSheet.style.left = "0";
  bottomSheet.style.right = "0";
  bottomSheet.style.bottom = "0";
  bottomSheet.style.backgroundColor = tokens.color.bg.surface;
  bottomSheet.style.borderTop = `1px solid ${tokens.color.border.subtle}`;
  bottomSheet.style.borderTopLeftRadius = tokens.radius.xl;
  bottomSheet.style.borderTopRightRadius = tokens.radius.xl;
  bottomSheet.style.boxShadow = tokens.shadow.md;
  bottomSheet.style.zIndex = tokens.zIndex.bottomSheet;
  bottomSheet.style.maxHeight = "70vh";
  bottomSheet.style.display = "flex";
  bottomSheet.style.flexDirection = "column";
  bottomSheet.style.transform = "translateY(100%)";
  bottomSheet.style.transition = "transform 0.3s ease";
  bottomSheet.style.fontFamily = tokens.font.system;

  // Drag handle
  const dragHandle = document.createElement("div");
  dragHandle.style.width = "36px";
  dragHandle.style.height = "4px";
  dragHandle.style.backgroundColor = tokens.color.bg.active;
  dragHandle.style.borderRadius = "2px";
  dragHandle.style.margin = "8px auto";
  dragHandle.style.flexShrink = "0";

  // Bottom sheet header
  const bottomSheetHeader = document.createElement("div");
  bottomSheetHeader.style.padding = "12px 20px 16px";
  bottomSheetHeader.style.borderBottom = `1px solid ${tokens.color.border.subtle}`;
  bottomSheetHeader.style.display = "flex";
  bottomSheetHeader.style.justifyContent = "space-between";
  bottomSheetHeader.style.alignItems = "center";

  // Header title
  const headerTitle = document.createElement("h3");
  headerTitle.textContent =
    name === "assignee"
      ? "Select Assignee"
      : name === "components"
        ? "Select Component"
        : `Select ${name}`;
  headerTitle.style.margin = "0";
  headerTitle.style.fontSize = "16px";
  headerTitle.style.fontWeight = "bold";
  headerTitle.style.color = tokens.color.text.primary;

  // Close button
  const closeButton = document.createElement("button");
  closeButton.innerHTML = "&#10005;";
  closeButton.style.background = "none";
  closeButton.style.border = "none";
  closeButton.style.fontSize = "20px";
  closeButton.style.cursor = "pointer";
  closeButton.style.color = tokens.color.text.dim;
  closeButton.style.padding = "4px 8px";
  closeButton.style.transition = `color ${tokens.transition.fast}`;
  closeButton.style.borderRadius = tokens.radius.sm;

  closeButton.addEventListener("mouseenter", () => {
    closeButton.style.color = tokens.color.text.primary;
  });
  closeButton.addEventListener("mouseleave", () => {
    closeButton.style.color = tokens.color.text.dim;
  });

  bottomSheetHeader.appendChild(headerTitle);
  bottomSheetHeader.appendChild(closeButton);

  // Bottom sheet content (scrollable)
  const bottomSheetContent = document.createElement("div");
  bottomSheetContent.style.flex = "1";
  bottomSheetContent.style.overflowY = "auto";
  bottomSheetContent.style.padding = "8px 0";

  // Bottom sheet footer (for multi-select)
  const bottomSheetFooter = document.createElement("div");
  bottomSheetFooter.style.padding = "16px 20px";
  bottomSheetFooter.style.borderTop = `1px solid ${tokens.color.border.subtle}`;
  bottomSheetFooter.style.display = multiple ? "block" : "none";

  const confirmButton = document.createElement("button");
  confirmButton.textContent = "Confirm";
  confirmButton.style.width = "100%";
  confirmButton.style.padding = "12px";
  confirmButton.style.background = "linear-gradient(135deg, #7c3aed, #6366f1)";
  confirmButton.style.color = "#ffffff";
  confirmButton.style.border = "none";
  confirmButton.style.borderRadius = tokens.radius.md;
  confirmButton.style.fontSize = "16px";
  confirmButton.style.fontWeight = "bold";
  confirmButton.style.fontFamily = tokens.font.system;
  confirmButton.style.cursor = "pointer";
  confirmButton.style.transition = `all ${tokens.transition.normal}`;

  confirmButton.addEventListener("mouseenter", () => {
    confirmButton.style.background =
      "linear-gradient(135deg, #6d28d9, #4f46e5)";
    confirmButton.style.boxShadow = tokens.shadow.glowViolet;
  });
  confirmButton.addEventListener("mouseleave", () => {
    confirmButton.style.background =
      "linear-gradient(135deg, #7c3aed, #6366f1)";
    confirmButton.style.boxShadow = "none";
  });

  bottomSheetFooter.appendChild(confirmButton);

  // Build bottom sheet
  bottomSheet.appendChild(dragHandle);
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

  // Selected value management
  let selectedValue: string | Set<string> = multiple ? new Set<string>() : "";
  let tempSelectedValue: string | Set<string> = multiple
    ? new Set<string>()
    : "";

  // Set default value
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

  // Update button text
  const updateButtonText = () => {
    if (multiple) {
      const selected = Array.from(selectedValue as Set<string>);
      if (selected.length === 0) {
        dropdownButton.textContent = placeholder;
        dropdownButton.style.color = tokens.color.text.dim;
        dropdownButton.appendChild(dropdownIcon);
        hiddenInput.value = "";
      } else {
        // Find labels of selected options
        const selectedLabels = selected.map((val) => {
          const option = options.find((opt) => opt.value === val);
          return option ? option.label : val;
        });
        dropdownButton.textContent = selectedLabels.join(", ");
        dropdownButton.style.color = tokens.color.text.secondary;
        dropdownButton.appendChild(dropdownIcon);
        hiddenInput.value = selected.join(",");
      }
    } else {
      const value = selectedValue as string;
      if (!value) {
        dropdownButton.textContent = placeholder;
        dropdownButton.style.color = tokens.color.text.dim;
        dropdownButton.appendChild(dropdownIcon);
        hiddenInput.value = "";
      } else {
        const option = options.find((opt) => opt.value === value);
        dropdownButton.textContent = option ? option.label : value;
        dropdownButton.style.color = tokens.color.text.secondary;
        dropdownButton.appendChild(dropdownIcon);
        hiddenInput.value = value;
      }
    }

    // Fire custom event (triggers form validation)
    const customEvent = new Event("customValueChange", { bubbles: true });
    hiddenInput.dispatchEvent(customEvent);
  };

  // Group options by category (preserve original order)
  // Options without category are handled separately to maintain order
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

  // Add options to bottom sheet
  const renderOptions = () => {
    bottomSheetContent.innerHTML = "";

    // Render in original order
    insertionOrder.forEach((category) => {
      const categoryOptions = optionsByCategory.get(category) || [];
      // Only show category header if category exists
      if (category) {
        const categoryHeader = document.createElement("div");
        categoryHeader.textContent = category;
        categoryHeader.style.padding = "12px 20px 8px";
        categoryHeader.style.fontWeight = "600";
        categoryHeader.style.color = tokens.color.text.dim;
        categoryHeader.style.backgroundColor = "#0f0f11";
        categoryHeader.style.fontSize = "12px";
        categoryHeader.style.textTransform = "uppercase";
        categoryHeader.style.letterSpacing = "0.05em";
        categoryHeader.style.zIndex = "1";
        bottomSheetContent.appendChild(categoryHeader);
      }

      // Add options
      categoryOptions.forEach((option) => {
        const optionItem = document.createElement("div");
        optionItem.style.padding = "14px 20px";
        optionItem.style.cursor = option.disabled ? "default" : "pointer";
        optionItem.style.fontSize = "15px";
        optionItem.style.color = option.disabled
          ? tokens.color.text.dim
          : tokens.color.text.secondary;
        optionItem.style.display = "flex";
        optionItem.style.alignItems = "center";
        optionItem.style.gap = "12px";
        optionItem.style.transition = `background-color ${tokens.transition.normal}`;

        if (option.disabled) {
          optionItem.style.fontWeight = "bold";
          optionItem.style.backgroundColor = tokens.color.bg.elevated;
          optionItem.textContent = option.label;
          bottomSheetContent.appendChild(optionItem);
          return;
        }

        if (multiple) {
          // Multi-select: include checkbox
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = option.value;
          checkbox.style.width = "20px";
          checkbox.style.height = "20px";
          checkbox.style.margin = "0";
          checkbox.style.cursor = "pointer";
          checkbox.style.accentColor = tokens.color.accent.violet;
          checkbox.checked = (tempSelectedValue as Set<string>).has(
            option.value,
          );

          const optionLabel = document.createElement("span");
          optionLabel.textContent = option.label;
          optionLabel.style.flex = "1";

          optionItem.appendChild(checkbox);
          optionItem.appendChild(optionLabel);

          // Click event
          const handleClick = (e: Event) => {
            // If the checkbox was clicked directly, its state is already toggled
            // so don't toggle again
            if (e.target !== checkbox) {
              checkbox.checked = !checkbox.checked;
            }

            if (checkbox.checked) {
              (tempSelectedValue as Set<string>).add(option.value);
            } else {
              (tempSelectedValue as Set<string>).delete(option.value);
            }
          };

          // Click event on entire optionItem
          optionItem.addEventListener("click", handleClick);

          // Checkbox click event (stop propagation and only update state)
          checkbox.addEventListener("click", (e: Event) => {
            e.stopPropagation();
            handleClick(e);
          });
        } else {
          // Single select
          const radioButton = document.createElement("div");
          radioButton.style.width = "20px";
          radioButton.style.height = "20px";
          radioButton.style.borderRadius = "50%";
          radioButton.style.border = `2px solid ${tokens.color.border.medium}`;
          radioButton.style.position = "relative";
          radioButton.style.flexShrink = "0";

          if (tempSelectedValue === option.value) {
            radioButton.style.borderColor = tokens.color.accent.violet;
            const inner = document.createElement("div");
            inner.style.position = "absolute";
            inner.style.top = "50%";
            inner.style.left = "50%";
            inner.style.transform = "translate(-50%, -50%)";
            inner.style.width = "10px";
            inner.style.height = "10px";
            inner.style.borderRadius = "50%";
            inner.style.backgroundColor = tokens.color.accent.violet;
            radioButton.appendChild(inner);
          }

          const optionLabel = document.createElement("span");
          optionLabel.textContent = option.label;
          optionLabel.style.flex = "1";

          optionItem.appendChild(radioButton);
          optionItem.appendChild(optionLabel);

          // Click event (single select applies immediately)
          optionItem.addEventListener("click", () => {
            selectedValue = option.value;
            tempSelectedValue = option.value;
            updateButtonText();
            closeBottomSheet();
          });
        }

        // Hover effect
        if (!option.disabled) {
          optionItem.addEventListener("mouseenter", () => {
            optionItem.style.backgroundColor = tokens.color.bg.hover;
          });
          optionItem.addEventListener("mouseleave", () => {
            optionItem.style.backgroundColor = "transparent";
          });
        }

        bottomSheetContent.appendChild(optionItem);
      });
    });
  };

  // Open/close bottom sheet
  const openBottomSheet = () => {
    // Initialize temporary selection
    if (multiple) {
      tempSelectedValue = new Set(selectedValue as Set<string>);
    } else {
      tempSelectedValue = selectedValue;
    }

    renderOptions();
    document.body.appendChild(bottomSheetOverlay);

    // Timing for animation
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

  // Event handlers
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

  // Multi-select confirm button
  if (multiple) {
    confirmButton.addEventListener("click", () => {
      selectedValue = new Set(tempSelectedValue as Set<string>);
      updateButtonText();
      closeBottomSheet();
    });
  }

  // Focus styles
  dropdownButton.addEventListener("focus", () => {
    dropdownButton.style.borderColor = tokens.color.accent.violet;
    dropdownButton.style.outline = "none";
    dropdownButton.style.boxShadow = `0 0 0 2px ${tokens.color.accent.violetGlow}`;
  });

  dropdownButton.addEventListener("blur", () => {
    dropdownButton.style.borderColor = tokens.color.border.medium;
    dropdownButton.style.boxShadow = "none";
  });

  // DOM construction
  dropdownContainer.appendChild(dropdownButton);
  dropdownContainer.appendChild(hiddenInput);

  // Set initial button text
  updateButtonText();

  // Trigger validation if default value exists
  if (defaultValue) {
    setTimeout(() => {
      const customEvent = new Event("customValueChange", { bubbles: true });
      hiddenInput.dispatchEvent(customEvent);
    }, 0);
  }

  // Get/set value methods
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
