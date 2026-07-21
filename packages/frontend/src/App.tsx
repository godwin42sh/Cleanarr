import { type ReactNode } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useCandidates, useCleanMutation, useScanMutation } from '@/hooks/useCandidates';
import { CandidateList } from '@/components/CandidateList';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function Alert({ variant, children }: { variant: 'error' | 'success'; children: ReactNode }) {
  return (
    <div
      role="status"
      className={cn(
        'rounded-lg border px-4 py-3 text-sm',
        variant === 'error' &&
          'border-destructive/40 bg-destructive/10 text-destructive dark:text-red-300',
        variant === 'success' && 'border-success/40 bg-success/10 text-success',
      )}
    >
      {children}
    </div>
  );
}

export function App() {
  const { data, isLoading, isError, error } = useCandidates();
  const scan = useScanMutation();
  const clean = useCleanMutation();

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <span>🧹</span> Cleanarr
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Unused downloads with no remaining hardlinks, matched to qBittorrent.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button onClick={() => scan.mutate()} disabled={scan.isPending}>
              {scan.isPending ? <Loader2 className="animate-spin" /> : <Search />}
              {scan.isPending ? 'Scanning…' : 'Scan now'}
            </Button>
          </div>
        </header>

        <main className="flex flex-col gap-4">
          {isLoading && (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" /> Scanning download directories…
            </p>
          )}

          {isError && (
            <Alert variant="error">Failed to load candidates: {(error as Error).message}</Alert>
          )}

          {scan.isError && (
            <Alert variant="error">Scan failed: {(scan.error as Error).message}</Alert>
          )}

          {clean.isError && (
            <Alert variant="error">Cleanup failed: {(clean.error as Error).message}</Alert>
          )}

          {clean.isSuccess && (
            <Alert variant="success">
              Cleaned {clean.data.cleaned} item(s), removed {clean.data.removedTorrentHashes.length}{' '}
              torrent(s).
              {clean.data.failed > 0 && ` ${clean.data.failed} failed.`}
            </Alert>
          )}

          {data && (
            <CandidateList
              candidates={data}
              onClean={(files) => clean.mutate(files)}
              isCleaning={clean.isPending}
            />
          )}
        </main>
      </div>
    </div>
  );
}
