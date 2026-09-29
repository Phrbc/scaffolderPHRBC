import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesPage } from './categories-page';
import { categoriesControllerCreate } from '../lib/api-client';

vi.mock('../lib/api-client', () => ({
  categoriesControllerFindAll: vi.fn().mockResolvedValue({
    data: {
      data: [
        {
          id: 'cat-1',
          name: 'Faculdade',
          color: '#10B981',
          ownerId: 'usr-1',
          taskCount: 3,
          createdAt: '2026-08-31T10:00:00.000Z',
          updatedAt: '2026-08-31T10:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    },
    status: 200,
    headers: new Headers(),
  }),
  categoriesControllerCreate: vi.fn().mockResolvedValue({ data: {}, status: 201, headers: new Headers() }),
  categoriesControllerUpdate: vi.fn(),
  categoriesControllerRemove: vi.fn(),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CategoriesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.mocked(categoriesControllerCreate).mockClear();
  });

  it('lists categories with their task count', async () => {
    renderPage();

    expect(screen.getByText('Categorias de Tarefas')).toBeInTheDocument();
    expect(await screen.findByTitle('Categoria: Faculdade')).toBeInTheDocument();
    expect(screen.getByText(/3 tarefas/)).toBeInTheDocument();
  });

  it('validates and creates a new category', async () => {
    renderPage();
    await screen.findByTitle('Categoria: Faculdade');

    fireEvent.click(screen.getByRole('button', { name: /Nova Categoria/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Criar Categoria' }));
    expect(await screen.findByText('O nome deve ter no mínimo 2 caracteres.')).toBeInTheDocument();
    expect(categoriesControllerCreate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Trabalho' } });
    fireEvent.click(screen.getByRole('button', { name: 'Usar cor #F59E0B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar Categoria' }));

    await waitFor(() =>
      expect(categoriesControllerCreate).toHaveBeenCalledWith({ name: 'Trabalho', color: '#F59E0B' }),
    );
  });
});
