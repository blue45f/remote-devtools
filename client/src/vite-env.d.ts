/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HOST: string;
  readonly VITE_WS_HOST: string;
  readonly VITE_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  RemoteDebugSdk?: {
    createDebugger: () => void;
  };
}
