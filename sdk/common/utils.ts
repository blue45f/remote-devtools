export function getAbsolutePath(url?: string | URL | null): string {
  if (!url || typeof url !== "string") return "";
  const a = document.createElement("a");
  a.href = url;
  return a.href;
}

export function key2UpperCase(key: string): string {
  return key.replace(/^\S|-[a-z]/g, (s) => s.toUpperCase());
}

export function isMobile(): boolean {
  return /ios|iphone|ipod|android/.test(navigator.userAgent.toLowerCase());
}

export function loadScript(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export function isElement(node: unknown): node is Element {
  return node instanceof Element;
}

export function isHTMLElement(node: unknown): node is HTMLElement {
  return node instanceof HTMLElement;
}

export function isMatches(element: Element, selector: string): boolean {
  // When some selectors in the safair kernel cannot be parsed, calling the matches method will throw an exception, which is captured here
  try {
    if (element.matches) {
      return element.matches(selector);
    }
    // deprecated
    if (element.webkitMatchesSelector) {
      return !!element.webkitMatchesSelector(selector);
    }
    // mozilla
    if ((element as any).mozMatchesSelector) {
      return !!(element as any).mozMatchesSelector(selector);
    }
  } catch {
    return false;
  }
  return false;
}

export function escapeRegString(string: string): string {
  return string.replace(/[\\$*+?.^|(){}[\]]/g, "\\$&");
}
