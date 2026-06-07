import { useFatalErrorStore } from '@/store/fatalErrorStore';

let installed = false;

function reportJsError(error: unknown, source: string) {
  const normalized =
    error instanceof Error ? error : new Error(typeof error === 'string' ? error : source);

  console.error(`[FLOW] ${source}:`, normalized.message, normalized.stack);
  try {
    useFatalErrorStore.getState().setFatalError(normalized);
  } catch {
    // Store henüz hazır değilse yoksay
  }
}

/** Release build'de yakalanmamış JS hatalarının RCTFatal ile çökmesini engeller. */
export function installGlobalErrorHandlers() {
  if (installed) return;
  installed = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ErrorUtils } = require('react-native') as {
      ErrorUtils?: {
        getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
        setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
      };
    };

    const previousHandler = ErrorUtils?.getGlobalHandler?.();

    ErrorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
      reportJsError(error, isFatal ? 'Fatal JS error' : 'JS error');
      if (__DEV__ && previousHandler) {
        previousHandler(error, isFatal);
      }
    });
  } catch (err) {
    console.warn('[FLOW] Global error handler kurulamadı:', err);
  }

  if (__DEV__) {
    try {
      const globalAny = globalThis as typeof globalThis & {
        HermesInternal?: {
          enablePromiseRejectionTracker?: (options: {
            allRejections: boolean;
            onUnhandled: (id: number, error: unknown) => void;
            onHandled: (id: number) => void;
          }) => void;
        };
      };

      globalAny.HermesInternal?.enablePromiseRejectionTracker?.({
        allRejections: true,
        onUnhandled: (_id, error) => {
          reportJsError(error, 'Unhandled promise rejection');
        },
        onHandled: () => {},
      });
    } catch {
      // Hermes tracker opsiyonel
    }
  }
}
