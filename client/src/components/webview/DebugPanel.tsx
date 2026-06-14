import {
  ArrowDownToLine,
  Code2,
  Edit,
  Hourglass,
  PenLine,
  Plus,
  Send,
  Terminal,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface DebugPanelProps {
  domNodes: string[];
  onDomChange: () => void;
  onConsoleLog: () => void;
  onToggleLoading: () => void;
  onFetchRequest: () => void;
  onXhrRequest: () => void;
  onKyRequest: () => void;
  onPostRequest: () => void;
  onPutRequest: () => void;
  onPatchRequest: () => void;
  onDeleteRequest: () => void;
}

export default function DebugPanel({
  domNodes,
  onDomChange,
  onConsoleLog,
  onToggleLoading,
  onFetchRequest,
  onXhrRequest,
  onKyRequest,
  onPostRequest,
  onPutRequest,
  onPatchRequest,
  onDeleteRequest,
}: DebugPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-fg">
          {t('webview.debugPanelTitle')}
        </h2>
        <p className="text-sm text-fg-subtle mt-1">{t('webview.debugPanelSubtitle')}</p>
      </div>

      <Section
        badge="GET"
        badgeTone="success"
        title={t('webview.readRequestsTitle')}
        description={t('webview.readRequestsDesc')}
      >
        <Button variant="secondary" size="sm" onClick={onFetchRequest}>
          <ArrowDownToLine />
          Fetch API
        </Button>
        <Button variant="secondary" size="sm" onClick={onXhrRequest}>
          <ArrowDownToLine />
          XMLHttpRequest
        </Button>
        <Button variant="secondary" size="sm" onClick={onKyRequest}>
          <ArrowDownToLine />
          ky
        </Button>
      </Section>

      <Section
        badge="WRITE"
        badgeTone="info"
        title={t('webview.mutationRequestsTitle')}
        description={t('webview.mutationRequestsDesc')}
      >
        <Button variant="secondary" size="sm" onClick={onPostRequest}>
          <Send />
          POST
        </Button>
        <Button variant="secondary" size="sm" onClick={onPutRequest}>
          <Edit />
          PUT
        </Button>
        <Button variant="secondary" size="sm" onClick={onPatchRequest}>
          <PenLine />
          PATCH
        </Button>
        <Button variant="secondary" size="sm" onClick={onDeleteRequest}>
          <Trash2 />
          DELETE
        </Button>
      </Section>

      <Section
        badge="DOM"
        badgeTone="warning"
        title={t('webview.domConsoleTitle')}
        description={t('webview.domConsoleDesc')}
      >
        <Button variant="secondary" size="sm" onClick={onDomChange}>
          <Plus />
          {t('webview.addDomNode')}
        </Button>
        <Button variant="secondary" size="sm" onClick={onConsoleLog}>
          <Terminal />
          {t('webview.consoleOutput')}
        </Button>
        <Button variant="secondary" size="sm" onClick={onToggleLoading}>
          <Hourglass />
          {t('webview.toggleLoading')}
        </Button>
      </Section>

      {domNodes.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3 text-[11px] uppercase tracking-wider font-semibold text-fg-faint">
            <Code2 className="size-3" />
            {t('webview.capturedDomNodes')}
            <span className="font-mono text-fg-subtle">({domNodes.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {domNodes.map((char, index) => (
              <span
                key={index}
                className="px-2 py-0.5 rounded bg-bg-muted text-xs font-mono text-fg"
              >
                {char}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Section({
  badge,
  badgeTone,
  title,
  description,
  children,
}: {
  badge: string;
  badgeTone: 'success' | 'info' | 'warning';
  title: string;
  description: string;
  children: ReactNode;
}) {
  const tone = {
    success: 'bg-success-soft text-success',
    info: 'bg-accent-soft text-accent-soft-fg',
    warning: 'bg-warning-soft text-warning',
  }[badgeTone];

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`h-5 px-1.5 rounded text-[10px] font-bold tracking-wider inline-flex items-center ${tone}`}
        >
          {badge}
        </span>
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
      </div>
      <p className="text-xs text-fg-subtle mb-3">{description}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </Card>
  );
}
