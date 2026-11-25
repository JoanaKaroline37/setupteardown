import { expect, test } from '@playwright/test';
import { USUARIOS, entrarPelaApi, login } from '../support/auth';
import { LivroCriado, criarLivro, limparLivro } from '../support/api';

test.describe('Empréstimo pela tela', () => {
  let tokenAdmin: string;
  let livro: LivroCriado | undefined;

  // SETUP (via API): livro com apenas 1 exemplar, para que o empréstimo o deixe indisponível.
  test.beforeEach(async ({ request }) => {
    livro = undefined;
    tokenAdmin = await login(request, USUARIOS.admin);
    livro = await criarLivro(request, tokenAdmin, {
      titulo: `Livro para Emprestar ${Date.now()}`,
      quantidade: 1,
    });
  });

  // TEARDOWN (via API): o empréstimo foi criado pela tela, então o teste não sabe o id dele.
  // limparLivro lista os empréstimos, apaga os do livro e SÓ DEPOIS apaga o livro
  // (livro com empréstimo ativo não pode ser excluído: 409).
  test.afterEach(async ({ request }) => {
    if (livro) await limparLivro(request, tokenAdmin, livro.id);
  });

  test('leitor empresta um livro pela tela e vê mensagem de sucesso e o livro como indisponível', async ({
    page,
  }) => {
    const livroCriado = livro!;
    await entrarPelaApi(page, USUARIOS.leitor);

    await page.goto(`/livros/${livroCriado.id}`);
    await expect(page.getByTestId('livro-disponibilidade')).toHaveText('Disponível');

    await page.getByTestId('botao-emprestar').click();

    await expect(page.getByTestId('mensagem-sucesso')).toHaveText('Empréstimo realizado com sucesso');
    await expect(page.getByTestId('livro-disponibilidade')).toHaveText('Indisponível');
    await expect(page.getByTestId('livro-quantidade-disponivel')).toHaveText('0 de 1');
  });
});
