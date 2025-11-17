/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  RemoteDebugSdk?: {
    createDebugger: (onClick?: () => void) => void;
  };
}
