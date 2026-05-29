import { ExternalLink } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, type ButtonProps } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { buildDevToolsLink } from '@/lib/devtools-link';
import { useAppStore } from '@/lib/store';

interface DevToolsLinkButtonProps extends Omit<ButtonProps, 'asChild' | 'onClick'> {
  /** Session room name (matches the SDK's `room` param). */
  room: string;
  /** Optional record id when opening a recorded session. */
  recordId?: number;
  /** Tooltip / aria-label override. */
  label?: string;
  children?: ReactNode;
}

/**
 * Button that opens the DevTools UI for a session — except in demo mode,
 * where the button surfaces a toast explaining the link requires a real
 * self-hosted backend (the public Vercel demo has no `localhost:3000`).
 *
 * Behaviour:
 *   - Demo mode (VITE_FORCE_DEMO or localStorage demo-mode=1):
 *       click → toast with "Self-host to use this" message + link to docs.
 *   - Real mode:
 *       click → opens the WebSocket-handshake URL in a new tab.
 */
export const DevToolsLinkButton = forwardRef<HTMLButtonElement, DevToolsLinkButtonProps>(
  ({ room, recordId, label, children, ...rest }, ref) => {
    const { t } = useTranslation();
    const demoMode = useAppStore((s) => s.demoMode);
    const forceDemo = import.meta.env.VITE_FORCE_DEMO === 'true';
    const isDemo = demoMode || forceDemo;
    const resolvedLabel = label ?? t('devtools.open');

    const handleClick = () => {
      if (isDemo) {
        toast(t('devtools.toastTitle'), {
          description: t('devtools.toastDescription'),
          duration: 6000,
          action: {
            label: t('devtools.selfHostDocs'),
            onClick: () =>
              window.open(
                'https://github.com/blue45f/remote-devtools/blob/main/docs/SELF_HOSTING.md',
                '_blank',
                'noopener,noreferrer',
              ),
          },
        });
        return;
      }
      const url = buildDevToolsLink(room, recordId);
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
      <Button ref={ref} type="button" onClick={handleClick} aria-label={resolvedLabel} {...rest}>
        {children ?? (
          <>
            <ExternalLink />
            DevTools
          </>
        )}
      </Button>
    );
  },
);
DevToolsLinkButton.displayName = 'DevToolsLinkButton';
