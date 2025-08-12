/// <reference types="vite/client" />

// Disable HMR for Replit environment
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly NODE_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}