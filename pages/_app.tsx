import { AppProps } from 'next/app';
import { AppProvider } from '../context/AppContext';
import { ToastProvider } from '../context/ToastContext';
import { ConfirmProvider } from '../context/ConfirmContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../styles.css';

const queryClient = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <AppProvider>
            <Component {...pageProps} />
          </AppProvider>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default MyApp;
