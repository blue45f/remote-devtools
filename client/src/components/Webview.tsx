import ky from 'ky';
import { CircuitBoard, ExternalLink, Terminal, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import DebugPanel from './webview/DebugPanel';
import ExploreTab from './webview/ExploreTab';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildDevToolsLink } from '@/lib/devtools-link';

export type SdkKind = 'module' | 'script';

const SAMPLE_ENDPOINTS = {
  fetchTodo: 'https://jsonplaceholder.typicode.com/todos/1?dd=1',
  xhrTodo: 'https://jsonplaceholder.typicode.com/todos/2',
  kyTodo: 'https://jsonplaceholder.typicode.com/todos/3',
  posts: 'https://jsonplaceholder.typicode.com/posts',
  post: 'https://jsonplaceholder.typicode.com/posts/1',
} as const;

interface WebviewPageProps {
  /**
   * Which SDK distribution to load.
   * - `module` (default): import via ESM dynamic import
   * - `script`: load the UMD bundle from the external server
   */
  kind?: SdkKind;
}

export const WebviewPage = ({ kind = 'module' }: WebviewPageProps) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [node, setNode] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'explore' | 'debug'>('explore');

  // SDK init
  useEffect(() => {
    if (kind === 'script') {
      const script = document.createElement('script');
      // Same-origin path (Vite dev proxy forwards /sdk → external in dev;
      // production usually serves both apps behind the same reverse proxy).
      script.src = '/sdk/index.umd.js';
      script.onload = () => {
        if (globalThis.RemoteDebugSdk) {
          globalThis.RemoteDebugSdk.createDebugger();
        }
      };
      document.head.appendChild(script);
      return () => {
        if (script.parentNode === document.head) {
          document.head.removeChild(script);
        }
      };
    }

    void import('remote-debug-sdk').then(({ createDebugger }) => {
      createDebugger();
    });
  }, [kind]);

  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Test handlers
  const handleApiRequest = () => {
    fetch(SAMPLE_ENDPOINTS.fetchTodo, { signal: AbortSignal.timeout(10_000) })
      .then((r) => r.json())
      .then((data) => emitSampleLog('Fetch Response:', data))
      .catch((e) => console.error('Fetch error:', e));
  };

  const handleXhrRequest = () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', SAMPLE_ENDPOINTS.xhrTodo, true);
    xhr.onload = () => {
      if (xhr.status === 200) emitSampleLog('XHR Response:', JSON.parse(xhr.responseText));
    };
    xhr.onerror = () => console.error('XHR error');
    xhr.send();
  };

  const handleKyRequest = async () => {
    try {
      const data = await ky.get(SAMPLE_ENDPOINTS.kyTodo).json();
      emitSampleLog('ky Response:', data);
    } catch (error) {
      console.error('ky error:', error);
    }
  };

  const makeRequest = async (method: string, url: string, data?: object) => {
    try {
      const response = await fetch(url, {
        method,
        headers: data ? { 'Content-Type': 'application/json' } : undefined,
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
      emitSampleLog(
        `${method} response:`,
        method === 'DELETE' ? response.status : await response.json(),
      );
    } catch (error) {
      console.error(`${method} error:`, error);
    }
  };

  const handleDomChange = () => {
    if (node.length >= 19) return;
    setNode([...node, getKoreanCharacterByConsonant(node.length)]);
  };

  const handleConsoleLog = () => {
    emitSampleLog('console click', { a: { b: { c: { d: 1 } } } });
    console.error('console error', new Error('error test'));
    console.warn('warn');
    throw new Error('error throw');
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-5xl mx-auto pb-24">
      <SdkBanner kind={kind} />

      <div className="mt-5">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'explore' | 'debug')}>
          <TabsList>
            <TabsTrigger value="explore" className="gap-1.5">
              <CircuitBoard className="size-3.5" />
              {t('webview.tabCustomerPage')}
            </TabsTrigger>
            <TabsTrigger value="debug" className="gap-1.5">
              <Terminal className="size-3.5" />
              {t('webview.tabDebugActions')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explore" className="mt-6">
            {isLoading ? <LoadingPanel /> : <ExploreTab domNodes={node} />}
          </TabsContent>

          <TabsContent value="debug" className="mt-6">
            <DebugPanel
              domNodes={node}
              onDomChange={handleDomChange}
              onConsoleLog={handleConsoleLog}
              onToggleLoading={() => setIsLoading(true)}
              onFetchRequest={handleApiRequest}
              onXhrRequest={handleXhrRequest}
              onKyRequest={handleKyRequest}
              onPostRequest={() =>
                makeRequest('POST', SAMPLE_ENDPOINTS.posts, {
                  title: 'New',
                  body: 'Test',
                  userId: 1,
                })
              }
              onPutRequest={() =>
                makeRequest('PUT', SAMPLE_ENDPOINTS.post, {
                  id: 1,
                  title: 'Updated',
                  body: 'Test',
                  userId: 1,
                })
              }
              onPatchRequest={() =>
                makeRequest('PATCH', SAMPLE_ENDPOINTS.post, {
                  title: 'Patched',
                })
              }
              onDeleteRequest={() => makeRequest('DELETE', SAMPLE_ENDPOINTS.post)}
            />
          </TabsContent>
        </Tabs>
      </div>

      <BottomCta />
    </div>
  );
};

function SdkBanner({ kind }: { kind: SdkKind }) {
  const { t } = useTranslation();
  const label = kind === 'module' ? t('webview.sdkBadgeModule') : t('webview.sdkBadgeScript');
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-bg-subtle">
      <span className="size-8 rounded-md bg-accent-soft text-accent-soft-fg flex items-center justify-center shrink-0">
        <Wifi className="size-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-medium text-fg">{t('webview.sdkPlayground')}</h1>
          <Badge variant="accent" size="sm">
            {label}
          </Badge>
          <span className="size-1.5 rounded-full bg-success animate-pulse-dot" />
          <span className="text-[11px] text-fg-faint">{t('webview.connected')}</span>
        </div>
        <p className="text-xs text-fg-subtle mt-0.5">{t('webview.sdkPlaygroundDesc')}</p>
      </div>
    </div>
  );
}

function LoadingPanel() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center h-[40vh]">
      <div className="flex flex-col items-center gap-2.5">
        <div className="size-8 rounded-full border-2 border-border border-t-fg animate-spin" />
        <span className="text-sm text-fg-subtle">{t('common.loading')}</span>
      </div>
    </div>
  );
}

function BottomCta() {
  const { t } = useTranslation();
  // The SDK publishes its active room/recordId. With no session there is nothing
  // to open, so the button is disabled.
  const [session, setSession] = useState<RemoteDebugSdkSession | null>(
    () => globalThis.RemoteDebugSdk?.getActiveSession?.() ?? null,
  );

  useEffect(() => {
    // The useState initializer above seeds the current session; this only needs
    // to track future open/close events the SDK publishes.
    const onSession = (e: WindowEventMap['remote-debug-sdk:session']) => setSession(e.detail);
    globalThis.addEventListener('remote-debug-sdk:session', onSession);
    return () => globalThis.removeEventListener('remote-debug-sdk:session', onSession);
  }, []);

  const disabled = !session?.room;
  // Smart target: a RECORDED session opens its dashboard detail page (which
  // renders the captured replay/network/console); a LIVE session opens the
  // Chrome DevTools view for real-time inspection.
  const isRecorded = !!(session?.recordMode && session.recordId !== null);
  const label = isRecorded ? t('webview.viewSession') : t('webview.openDevtools');

  const handleOpen = () => {
    if (!session?.room) return;
    const url = isRecorded ? `/sessions/${session.recordId}` : buildDevToolsLink(session.room);
    globalThis.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-4 right-4 z-20">
      <Button
        variant="primary"
        onClick={handleOpen}
        disabled={disabled}
        title={disabled ? t('webview.openDevtoolsNoSession') : undefined}
        aria-label={disabled ? t('webview.openDevtoolsNoSession') : label}
        className="shadow-lg"
      >
        <ExternalLink />
        {disabled ? t('webview.openDevtools') : label}
      </Button>
    </div>
  );
}

function getKoreanCharacterByConsonant(offset: number) {
  const baseCode = 0xac00;
  const consonantInterval = 588;
  return String.fromCharCode(baseCode + consonantInterval * offset);
}

function emitSampleLog(...args: unknown[]) {
  globalThis.console.log(...args);
}
