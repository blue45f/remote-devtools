import { ExternalLink } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, type ButtonProps } from '@/components/ui/button';
import { buildDevToolsLink } from '@/lib/devtools-link';

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
 * Button that opens the DevTools UI for a session.
 */
export const DevToolsLinkButton = forwardRef<HTMLButtonElement, DevToolsLinkButtonProps>(
  ({ room, recordId, label, children, ...rest }, ref) => {
    const { t } = useTranslation();
    const resolvedLabel = label ?? t('devtools.open');

    const handleClick = () => {
      const url = buildDevToolsLink(room, recordId);
      globalThis.open(url, '_blank', 'noopener,noreferrer');
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
