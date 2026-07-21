import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '@/App';
import { client } from '@/client/client.gen';
import { ThemeProvider } from '@/components/theme-provider';
import '@/index.css';

// The generated client defaults to baseUrl '/api'; allow an override for
// non-proxied setups.
if (import.meta.env.VITE_API_URL) {
  client.setConfig({ baseUrl: import.meta.env.VITE_API_URL });
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
