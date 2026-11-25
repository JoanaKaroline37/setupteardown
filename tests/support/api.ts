import { APIRequestContext, expect } from '@playwright/test';
import { bearer } from './auth';

export interface NovoLivro {
  titulo: string;
  autor: string;
  isbn: string;
  anoPublicacao: number;
  quantidade: number;
}

export interface LivroCriado extends NovoLivro {
  id: number;
}

/** ISBN de 13 dígitos diferente a cada chamada (a API recusa ISBN repetido com 409). */
export function gerarIsbn(): string {
  const sufixo = Math.floor(Math.random() * 1000);
  return (String(Date.now()) + String(sufixo).padStart(3, '0')).slice(-13);
}

/** Cria um livro pela API (admin). Qualquer campo pode ser sobrescrito. */
export async function criarLivro(
  request: APIRequestContext,
  tokenAdmin: string,
  dados: Partial<NovoLivro> = {},
): Promise<LivroCriado> {
  const livro: NovoLivro = {
    titulo: `Livro de Teste ${Date.now()}`,
    autor: 'Autor de Teste',
    isbn: gerarIsbn(),
    anoPublicacao: 2000,
    quantidade: 1,
    ...dados,
  };

  const resposta = await request.post('/api/livros', { headers: bearer(tokenAdmin), data: livro });
  expect(resposta.status(), 'setup: POST /api/livros deve responder 201').toBe(201);

  return resposta.json();
}

/** Apaga um livro pela API. Aceita 404 para não falhar se ele já tiver sido apagado. */
export async function apagarLivro(request: APIRequestContext, tokenAdmin: string, livroId: number) {
  const resposta = await request.delete(`/api/livros/${livroId}`, { headers: bearer(tokenAdmin) });
  expect([204, 404], `teardown: DELETE /api/livros/${livroId}`).toContain(resposta.status());
}

/**
 * Apaga TODOS os empréstimos de um livro. Útil quando o empréstimo foi criado pela tela
 * e o teste não sabe o id dele: o admin lista todos os empréstimos e filtra pelo livroId.
 */
export async function apagarEmprestimosDoLivro(request: APIRequestContext, tokenAdmin: string, livroId: number) {
  const lista = await request.get('/api/emprestimos', { headers: bearer(tokenAdmin) });
  expect(lista.status(), 'teardown: GET /api/emprestimos deve responder 200').toBe(200);

  const emprestimos: { id: number; livroId: number }[] = await lista.json();

  for (const emprestimo of emprestimos.filter((e) => e.livroId === livroId)) {
    const exclusao = await request.delete(`/api/emprestimos/${emprestimo.id}`, { headers: bearer(tokenAdmin) });
    expect([204, 404], `teardown: DELETE /api/emprestimos/${emprestimo.id}`).toContain(exclusao.status());
  }
}

/** Limpeza completa de um livro, na ordem segura: empréstimos primeiro, livro depois. */
export async function limparLivro(request: APIRequestContext, tokenAdmin: string, livroId: number) {
  await apagarEmprestimosDoLivro(request, tokenAdmin, livroId);
  await apagarLivro(request, tokenAdmin, livroId);
}
