export interface HarRow {
  requestId: number;
  timestamp: number;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  resourceType?: string;
  mimeType?: string;
  encodedDataLength?: number;
  responseBody?: string | null;
  base64Encoded?: boolean | null;
}

/**
 * Build an HTTP Archive (HAR) v1.2 JSON document from captured network
 * rows. Fields we don't have go to the sensible HAR defaults (empty
 * arrays for headers/cookies, -1 for missing size fields, 0 timings).
 *
 * Spec: http://www.softwareishard.com/blog/har-12-spec/
 *
 * Callers can `JSON.stringify(buildHar(rows, name))` to get a file
 * that Chrome DevTools, Charles, Fiddler, and Insomnia all accept.
 */
export function buildHar(
  rows: HarRow[],
  sessionName?: string,
): {
  log: {
    version: '1.2';
    creator: { name: string; version: string };
    pages?: {
      id: string;
      startedDateTime: string;
      title: string;
      pageTimings: { onContentLoad: -1; onLoad: -1 };
    }[];
    entries: HarEntry[];
  };
} {
  return {
    log: {
      version: '1.2',
      creator: { name: 'remote-devtools', version: '1.0' },
      pages: sessionName
        ? [
            {
              id: 'page_0',
              startedDateTime: new Date(rows[0]?.timestamp ?? Date.now()).toISOString(),
              title: sessionName,
              pageTimings: { onContentLoad: -1, onLoad: -1 },
            },
          ]
        : undefined,
      entries: rows.map((row) => toHarEntry(row, sessionName ? 'page_0' : undefined)),
    },
  };
}

interface HarEntry {
  pageref?: string;
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    httpVersion: string;
    headers: { name: string; value: string }[];
    queryString: { name: string; value: string }[];
    cookies: never[];
    headersSize: number;
    bodySize: number;
  };
  response: {
    status: number;
    statusText: string;
    httpVersion: string;
    headers: { name: string; value: string }[];
    cookies: never[];
    content: {
      size: number;
      mimeType: string;
      text?: string;
      encoding?: string;
    };
    redirectURL: string;
    headersSize: number;
    bodySize: number;
  };
  cache: Record<string, never>;
  timings: { send: number; wait: number; receive: number };
  _resourceType?: string;
}

function toHarEntry(row: HarRow, pageref?: string): HarEntry {
  const queryString = extractQueryString(row.url);
  const responseHeaders =
    row.mimeType !== undefined ? [{ name: 'Content-Type', value: row.mimeType }] : [];

  const responseContent: HarEntry['response']['content'] = {
    size: row.encodedDataLength ?? -1,
    mimeType: row.mimeType ?? 'x-unknown',
  };
  if (row.responseBody !== null && row.responseBody !== undefined) {
    responseContent.text = row.responseBody;
    if (row.base64Encoded) responseContent.encoding = 'base64';
  }

  return {
    pageref,
    startedDateTime: new Date(row.timestamp).toISOString(),
    time: 0,
    request: {
      method: row.method.toUpperCase(),
      url: row.url,
      httpVersion: 'HTTP/1.1',
      headers: [],
      queryString,
      cookies: [],
      headersSize: -1,
      bodySize: -1,
    },
    response: {
      status: row.status ?? 0,
      statusText: row.statusText ?? '',
      httpVersion: 'HTTP/1.1',
      headers: responseHeaders,
      cookies: [],
      content: responseContent,
      redirectURL: '',
      headersSize: -1,
      bodySize: row.encodedDataLength ?? -1,
    },
    cache: {},
    timings: { send: 0, wait: 0, receive: 0 },
    _resourceType: row.resourceType,
  };
}

function extractQueryString(url: string): { name: string; value: string }[] {
  try {
    const parsed = new URL(url);
    const out: { name: string; value: string }[] = [];
    parsed.searchParams.forEach((value, name) => {
      out.push({ name, value });
    });
    return out;
  } catch {
    return [];
  }
}
