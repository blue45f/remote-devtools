import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  /** Informational only — shown as a corner chip. */
  language?: string;
  /** Hide the copy button. */
  noCopy?: boolean;
  className?: string;
  /** Soft-wrap long lines instead of horizontal scroll. */
  wrap?: boolean;
}

/**
 * Dependency-free code/JSON viewer with copy. Replaces react-syntax-highlighter
 * (which the admin pulled in). Monospace is reserved for machine data so
 * copyable values stay unambiguous (DESIGN.md).
 */
export function CodeBlock({ code, language, noCopy, className, wrap }: CodeBlockProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className={cn('group relative rounded-lg border border-border bg-bg-subtle', className)}>
      {language && (
        <span className="absolute left-3 top-2 text-[10px] font-semibold uppercase tracking-wide text-fg-faint">
          {language}
        </span>
      )}
      {!noCopy && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={copy}
          aria-label={t('common.copy')}
          // Reveal on hover/focus for pointer users; stay visible on touch
          // devices (no hover) so the copy affordance isn't unreachable there.
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        >
          {copied ? <Check className="text-success" /> : <Copy />}
        </Button>
      )}
      <pre
        className={cn(
          'overflow-x-auto p-4 text-xs leading-relaxed text-fg-muted font-mono',
          language && 'pt-7',
          wrap && 'whitespace-pre-wrap break-words',
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
