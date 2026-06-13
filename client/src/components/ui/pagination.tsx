import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number; // 1-based
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Minimal prev / indicator / next pager. Replaces antd <Pagination>. */
export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  const { t } = useTranslation();
  if (pageCount <= 1) return null;
  return (
    <div className={cn('flex items-center justify-end gap-2', className)}>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label={t('ui.prevPage')}
      >
        <ChevronLeft />
      </Button>
      <span className="text-xs tabular-nums text-fg-subtle">
        {page} / {pageCount}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        aria-label={t('ui.nextPage')}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
