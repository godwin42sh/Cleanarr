import { useMemo, useState } from 'react';
import {
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown, Trash2 } from 'lucide-react';
import type { CleanupCandidate } from '@/api/types';
import { formatAge, formatSize } from '@/utils/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Props {
  candidates: CleanupCandidate[];
  onClean: (files: string[]) => void;
  isCleaning: boolean;
}

const candidateName = (c: CleanupCandidate): string =>
  c.torrents[0]?.name ?? c.files[0]?.path ?? c.id;

const filesOf = (candidates: CleanupCandidate[]): string[] =>
  candidates.flatMap((c) => c.files.map((f) => f.path));

/** A clickable column header that cycles the sort state. */
function SortHeader({
  label,
  sorted,
  onToggle,
  align = 'left',
}: {
  label: string;
  sorted: false | 'asc' | 'desc';
  onToggle: () => void;
  align?: 'left' | 'right';
}) {
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ChevronsUpDown;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className={cn('-ml-2 h-8 data-[active=true]:text-foreground', align === 'right' && 'ml-0')}
      data-active={sorted !== false}
    >
      <span>{label}</span>
      <Icon className={cn('size-3.5', sorted === false && 'text-muted-foreground/60')} />
    </Button>
  );
}

export function CandidateList({ candidates, onClean, isCleaning }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'age', desc: true }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const columns = useMemo<ColumnDef<CleanupCandidate>[]>(
    () => [
      {
        id: 'select',
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllRowsSelected()
                ? true
                : table.getIsSomeRowsSelected()
                  ? 'indeterminate'
                  : false
            }
            onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label={`Select ${candidateName(row.original)}`}
          />
        ),
      },
      {
        id: 'name',
        accessorFn: candidateName,
        header: ({ column }) => (
          <SortHeader
            label="Torrent / file"
            sorted={column.getIsSorted()}
            onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          />
        ),
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex flex-col gap-1.5">
              <span className="font-medium break-all" title={c.id}>
                {candidateName(c)}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {c.crossSeed && (
                  <Badge variant="secondary" title="Matched by multiple torrents">
                    cross-seed ×{c.torrents.length}
                  </Badge>
                )}
                {c.torrents.length === 0 && (
                  <Badge variant="destructive" title="No matching torrent — deleted from disk">
                    orphan
                  </Badge>
                )}
                {c.files.length > 1 && <Badge variant="outline">{c.files.length} files</Badge>}
              </div>
            </div>
          );
        },
      },
      {
        id: 'size',
        accessorKey: 'totalSizeBytes',
        header: ({ column }) => (
          <div className="flex justify-end">
            <SortHeader
              label="Size"
              align="right"
              sorted={column.getIsSorted()}
              onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-muted-foreground text-right tabular-nums">
            {formatSize(row.original.totalSizeBytes)}
          </div>
        ),
      },
      {
        id: 'age',
        accessorKey: 'ageDays',
        header: ({ column }) => (
          <div className="flex justify-end">
            <SortHeader
              label="Age"
              align="right"
              sorted={column.getIsSorted()}
              onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-muted-foreground text-right tabular-nums">
            {formatAge(row.original.ageDays)}
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: candidates,
    columns,
    state: { sorting, rowSelection },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const reclaimable = selectedRows.reduce((sum, r) => sum + r.original.totalSizeBytes, 0);

  const cleanSelected = () => {
    if (selectedRows.length === 0) return;
    onClean(filesOf(selectedRows.map((r) => r.original)));
    setRowSelection({});
  };

  const cleanAll = () => {
    onClean(filesOf(candidates));
    setRowSelection({});
  };

  if (candidates.length === 0) {
    return (
      <Card className="items-center justify-center py-16 text-center">
        <p className="text-4xl">🎉</p>
        <p className="text-muted-foreground">Nothing to clean — every download is still linked.</p>
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <span className="text-muted-foreground text-sm">
          {selectedRows.length} of {candidates.length} selected
          {reclaimable > 0 && ` · ${formatSize(reclaimable)} reclaimable`}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={cleanSelected}
            disabled={isCleaning || selectedRows.length === 0}
          >
            <Trash2 /> Clean selected
          </Button>
          <Button variant="destructive" size="sm" onClick={cleanAll} disabled={isCleaning}>
            <Trash2 /> {isCleaning ? 'Cleaning…' : 'Clean all'}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id} className={header.id === 'select' ? 'w-10' : undefined}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
