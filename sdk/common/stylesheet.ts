const styleSheetMap = new Map<string, CSSStyleSheet>();
const inlineStyleSheetIds = new Map<number, string>();
const inlineStyleNodeIds = new Map<string, number>();

export function createStyleSheet(styleSheetId: string): CSSStyleSheet {
  const styleSheet = new CSSStyleSheet();
  styleSheetMap.set(styleSheetId, styleSheet);
  return styleSheet;
}

export function getStyleSheetById(
  styleSheetId: string,
): CSSStyleSheet | undefined {
  return styleSheetMap.get(styleSheetId);
}

export function setStyleSheet(
  styleSheetId: string,
  styleSheet: CSSStyleSheet,
): void {
  styleSheetMap.set(styleSheetId, styleSheet);
}

export function getInlineStyleSheetId(nodeId: number): string | undefined {
  return inlineStyleSheetIds.get(nodeId);
}

export function getInlineStyleNodeId(styleSheetId: string): number | undefined {
  return inlineStyleNodeIds.get(styleSheetId);
}

export function setInlineStyleSheetId(
  nodeId: number,
  styleSheetId: string,
): void {
  inlineStyleSheetIds.set(nodeId, styleSheetId);
  inlineStyleNodeIds.set(styleSheetId, nodeId);
}
