/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INTERNAL_HOST: string;
  readonly VITE_INTERNAL_WS: string;
  readonly VITE_EXTERNAL_HOST: string;
  readonly VITE_EXTERNAL_WS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
