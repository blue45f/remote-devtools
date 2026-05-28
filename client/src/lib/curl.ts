export interface CurlRow {
  method: string;
  url: string;
  mimeType?: string;
}

/**
 * Build a `curl …` command line for a captured network row. Only the bits
 * the backend reliably stores — method, URL, and an Accept hint from
 * mimeType — are emitted. Users can fill in headers / body in their
 * terminal.
 *
 * URL is wrapped in single quotes so shell expansion doesn't munge it;
 * embedded single quotes use the standard `'\''` escape so the command
 * round-trips through bash/zsh.
 */
export function buildCurlCommand(row: CurlRow): string {
  const parts: string[] = ['curl'];
  if (row.method && row.method.toUpperCase() !== 'GET') {
    parts.push('-X', row.method.toUpperCase());
  }
  const escapedUrl = (row.url ?? '').replace(/'/g, "'\\''");
  parts.push(`'${escapedUrl}'`);
  if (row.mimeType) {
    parts.push('-H', `'Accept: ${row.mimeType}'`);
  }
  return parts.join(' ');
}
