import { defineConfig } from '@playwright/test';

// A API da biblioteca precisa estar rodando antes dos testes (npm run dev).
export default defineConfig({
  testDir: './tests',
  workers: 1,
  use: { baseURL: 'http://localhost:3000' },
});
