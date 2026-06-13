import { X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Chip multi-input. Enter / comma commits a value; Backspace on an empty field
 * removes the last chip. Replaces antd <Select mode="tags">.
 */
export function TagInput({ value, onChange, placeholder, disabled, className, id }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const next = raw.trim().replace(/,$/, '');
    if (next && !value.includes(next)) onChange([...value, next]);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5',
        'focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/40',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      {value.map((tag) => (
        <Badge key={tag} variant="neutral" size="sm" className="gap-1">
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="text-fg-faint hover:text-fg"
            aria-label={`remove ${tag}`}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        id={id}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft && commit(draft)}
        placeholder={value.length ? '' : placeholder}
        className="flex-1 min-w-[80px] bg-transparent text-sm text-fg outline-none placeholder:text-fg-faint"
      />
    </div>
  );
}
