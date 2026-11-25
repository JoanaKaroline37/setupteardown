import { APIRequestContext, Page, expect } from '@playwright/test';

/** Usuários do seed da API (ver README da Biblioteca). */
export const USUARIOS = {
  admin: { email: 'admin@biblioteca.com', senha: 'Admin@123' },
  leitor: { email: 'leitor@biblioteca.com', senha: 'Leitor@123' },
} as const;

/** Faz login pela API e devolve só o token JWT. */
export async function login(
  request: APIRequestContext,
  credenciais: { email: string; senha: string },
): Promise<string> {
  const resposta = await request.post('/api/auth/login', { data: credenciais });
  expect(resposta.status(), 'login deve responder 200').toBe(200);

  const { token } = await resposta.json();
  return token;
}

/** Monta o cabeçalho Authorization no formato esperado pela API. */
export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Faz login pela API e injeta token e usuário no localStorage ANTES de a página carregar,
 * assim o teste abre direto a tela desejada sem passar pelo /login.
 * (As chaves "token" e "usuario" são as que a interface da Biblioteca usa.)
 */
export async function entrarPelaApi(
  page: Page,
  credenciais: { email: string; senha: string },
): Promise<void> {
  const resposta = await page.request.post('/api/auth/login', { data: credenciais });
  expect(resposta.status(), 'login deve responder 200').toBe(200);
  const { token, usuario } = await resposta.json();

  await page.addInitScript(
    ([t, u]) => {
      localStorage.setItem('token', t);
      localStorage.setItem('usuario', u);
    },
    [token, JSON.stringify(usuario)],
  );
}
