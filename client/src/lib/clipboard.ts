/**
 * Robust copy-to-clipboard utility.
 * Attempts to use the modern async clipboard API first, and falls back to
 * the legacy execCommand('copy') method if running in a non-secure HTTP context
 * or on a browser without clipboard API support.
 */
export async function copyToClipboard(text: string): Promise<void> {
  // If the browser supports the modern API and we are in a secure context
  if (
    navigator.clipboard &&
    (globalThis.isSecureContext ||
      globalThis.location.hostname === 'localhost' ||
      globalThis.location.hostname === '127.0.0.1')
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to fallback if it fails
    }
  }

  // Fallback method using a temporary textarea
  const textArea = document.createElement('textarea');
  textArea.value = text;

  // Position off-screen and make read-only
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = '0';
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';
  textArea.setAttribute('readonly', 'true');

  document.body.appendChild(textArea);
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (!successful) {
      throw new Error('execCommand copy returned false');
    }
  } catch (err) {
    throw new Error('Failed to copy text using fallback method', { cause: err });
  } finally {
    document.body.removeChild(textArea);
  }
}
