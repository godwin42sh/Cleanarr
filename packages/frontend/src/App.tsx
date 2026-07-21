import { useCandidates, useCleanMutation } from './hooks/useCandidates';
import { CandidateList } from './components/CandidateList';
import './App.css';

export function App() {
  const { data, isLoading, isError, error, refetch, isFetching } = useCandidates();
  const clean = useCleanMutation();

  return (
    <div className="app">
      <header className="app__header">
        <h1>
          <span className="logo">🧹</span> Cleanarr
        </h1>
        <button type="button" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? 'Scanning…' : 'Rescan'}
        </button>
      </header>

      <main className="app__main">
        {isLoading && <p className="status">Scanning download directories…</p>}

        {isError && (
          <p className="status status--error">
            Failed to load candidates: {(error as Error).message}
          </p>
        )}

        {clean.isError && (
          <p className="status status--error">Cleanup failed: {(clean.error as Error).message}</p>
        )}

        {clean.isSuccess && (
          <p className="status status--success">
            Cleaned {clean.data.cleaned} item(s), removed {clean.data.removedTorrentHashes.length}{' '}
            torrent(s).
            {clean.data.failed > 0 && ` ${clean.data.failed} failed.`}
          </p>
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
  );
}
