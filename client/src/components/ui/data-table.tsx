import { type ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface Column<T> {
  /** Stable key, also used as React key. */
  key: string;
  header: ReactNode;
  /** Cell renderer. */
  cell: (row: T, index: number) => ReactNode;
  className?: string;
  headClassName?: string;
  /** Right-align numeric columns. */
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: ReadonlyArray<Column<T>>;
  rows: ReadonlyArray<T>;
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  isRowActive?: (row: T) => boolean;
  loading?: boolean;
  skeletonRows?: number;
  empty?: ReactNode;
  className?: string;
}

const ALIGN: Record<NonNullable<Column<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

/**
 * Thin presentational data table: columns + rows. Sorting/paging are owned by
 * the caller (compose with <Pagination>). Replaces antd <Table dataSource>.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  isRowActive,
  loading,
  skeletonRows = 6,
  empty,
  className,
}: DataTableProps<T>) {
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c.key} className={cn(c.align && ALIGN[c.align], c.headClassName)}>
              {c.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: skeletonRows }).map((_, r) => (
            <TableRow key={`sk-${r}`}>
              {columns.map((c) => (
                <TableCell key={c.key} className={c.align && ALIGN[c.align]}>
                  <Skeleton className="h-4 w-full max-w-[120px]" />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="py-10 text-center text-fg-faint">
              {empty}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row, i) => {
            const active = isRowActive?.(row);
            return (
              <TableRow
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  onRowClick && 'cursor-pointer hover:bg-bg-muted/60',
                  active && 'bg-accent-soft hover:bg-accent-soft',
                )}
              >
                {columns.map((c) => (
                  <TableCell key={c.key} className={cn(c.align && ALIGN[c.align], c.className)}>
                    {c.cell(row, i)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
