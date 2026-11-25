import { expect, test } from '@playwright/test';
import { USUARIOS, bearer, login } from './support/auth';

test.describe('API da Biblioteca', () => {
  test('GET /api/livros/1 retorna 200 com "Dom Casmurro" marcado como disponível', async ({ request }) => {
    const resposta = await request.get('/api/livros/1');

    expect(resposta.status()).toBe(200);

    const livro = await resposta.json();
    expect(livro.titulo).toBe('Dom Casmurro');
    expect(livro.disponivel).toBe(true);
  });

  test('POST /api/livros como admin retorna 201 com os mesmos dados enviados e um id (e remove o livro ao final)', async ({
    request,
  }) => {
    const token = await login(request, USUARIOS.admin);

    // ISBN único por execução: evita 409 "ISBN já cadastrado" se o teste rodar de novo.
    const isbn = String(Date.now()).padStart(13, '0').slice(-13);
    const novoLivro = {
      titulo: 'O Alienista',
      autor: 'Machado de Assis',
      isbn,
      anoPublicacao: 1882,
      quantidade: 2,
    };

    let idCriado: number | undefined;
    try {
      const resposta = await request.post('/api/livros', {
        headers: bearer(token),
        data: novoLivro,
      });

      expect(resposta.status()).toBe(201);

      const livro = await resposta.json();
      idCriado = livro.id;

      expect(livro.id).toEqual(expect.any(Number));
      expect(livro).toMatchObject(novoLivro);
    } finally {
      // Teardown: roda mesmo se alguma asserção acima falhar, para não deixar sujeira no banco.
      if (idCriado !== undefined) {
        const exclusao = await request.delete(`/api/livros/${idCriado}`, { headers: bearer(token) });
        expect(exclusao.status(), 'teardown: DELETE deve responder 204').toBe(204);
      }
    }
  });

  test('POST /api/livros sem token é recusado com 401 e mensagem "Token não informado"', async ({ request }) => {
    const resposta = await request.post('/api/livros', {
      data: {
        titulo: 'Livro Sem Autorização',
        autor: 'Autor Qualquer',
        isbn: '9788500009999',
        anoPublicacao: 2000,
        quantidade: 1,
      },
    });

    expect(resposta.status()).toBe(401);

    const corpo = await resposta.json();
    expect(corpo.erro).toBe('Token não informado');
    expect(corpo.status).toBe(401);
  });

  test('POST /api/emprestimos do livro 4 "Vidas Secas" (sem exemplares) retorna 409 "Livro indisponível"', async ({
    request,
  }) => {
    const token = await login(request, USUARIOS.leitor);

    const resposta = await request.post('/api/emprestimos', {
      headers: bearer(token),
      data: { livroId: 4 },
    });

    expect(resposta.status()).toBe(409);

    const corpo = await resposta.json();
    expect(corpo.erro).toBe('Livro indisponível');
    expect(corpo.status).toBe(409);
  });

  // Cenário extra (README, item 18): perfil sem permissão recebe 403, diferente do 401 de quem não está autenticado.
  test('POST /api/livros com token de leitor é recusado com 403 (autenticado, mas sem permissão)', async ({
    request,
  }) => {
    const token = await login(request, USUARIOS.leitor);

    const resposta = await request.post('/api/livros', {
      headers: bearer(token),
      data: {
        titulo: 'Livro Do Leitor',
        autor: 'Autor Qualquer',
        isbn: '9788500008888',
        anoPublicacao: 2000,
        quantidade: 1,
      },
    });

    expect(resposta.status()).toBe(403);

    const corpo = await resposta.json();
    expect(corpo.status).toBe(403);
    expect(corpo.erro).toEqual(expect.any(String));
  });
});
