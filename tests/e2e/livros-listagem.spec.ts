import { expect, test } from '@playwright/test';
import { USUARIOS, entrarPelaApi, login } from '../support/auth';
import { LivroCriado, apagarLivro, criarLivro } from '../support/api';

test.describe('Listagem de livros', () => {
  let tokenAdmin: string;
  let livro: LivroCriado | undefined;

  // SETUP (via API): cria o livro que a tela vai exibir.
  test.beforeEach(async ({ request }) => {
    livro = undefined;
    tokenAdmin = await login(request, USUARIOS.admin);
    livro = await criarLivro(request, tokenAdmin, {
      titulo: `Livro da Listagem ${Date.now()}`,
      autor: 'Autora Da Listagem',
      quantidade: 2,
    });
  });

  // TEARDOWN (via API): apaga o livro criado no setup. O afterEach roda mesmo se o teste falhar.
  test.afterEach(async ({ request }) => {
    if (livro) await apagarLivro(request, tokenAdmin, livro.id);
  });

  test('livro criado pela API aparece na listagem com título, autor e "Disponível"', async ({ page }) => {
    const livroCriado = livro!;
    await entrarPelaApi(page, USUARIOS.leitor);

    await page.goto('/livros');

    await expect(page.getByTestId(`livro-linha-${livroCriado.id}`)).toBeVisible();
    await expect(page.getByTestId(`livro-titulo-${livroCriado.id}`)).toHaveText(livroCriado.titulo);
    await expect(page.getByTestId(`livro-autor-${livroCriado.id}`)).toHaveText('Autora Da Listagem');
    await expect(page.getByTestId(`livro-disponibilidade-${livroCriado.id}`)).toHaveText('Disponível');
  });
});
