import { useQuery } from '@tanstack/react-query';
import { categoriesControllerFindAll } from '../lib/api-client';
import type { CategoryDto, PaginatedCategoriesResponseDto } from '../lib/api-client/models';

export const CATEGORIES_QUERY_KEY = ['categories'] as const;

/** Paleta sugerida no formulário de categorias (o usuário também pode escolher qualquer cor). */
export const CATEGORY_COLOR_PRESETS = [
  '#3B82F6', // azul
  '#10B981', // verde
  '#F59E0B', // âmbar
  '#EF4444', // vermelho
  '#8B5CF6', // violeta
  '#EC4899', // rosa
  '#14B8A6', // turquesa
  '#64748B', // cinza
] as const;

/**
 * Carrega as categorias visíveis ao usuário (até 100, ordenadas por nome).
 * Compartilhado entre a página de categorias e os formulários/filtros de tarefas,
 * de modo que um único cache do React Query atende as duas telas.
 */
export function useTaskCategories() {
  const query = useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: async () => {
      const res = await categoriesControllerFindAll({ page: 1, pageSize: 100 });
      return res.data;
    },
  });

  const categories: CategoryDto[] =
    query.data && 'data' in (query.data as PaginatedCategoriesResponseDto)
      ? (query.data as PaginatedCategoriesResponseDto).data
      : [];

  return { ...query, categories };
}
