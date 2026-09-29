import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Edit2, ListTodo, Plus, Tag, Trash2, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { CategoryBadge } from '../components/ui/category-badge';
import { Input } from '../components/ui/input';
import { ActionFeedback, EmptyState, ErrorState, LoadingState } from '../components/ui/state-feedback';
import {
  CATEGORIES_QUERY_KEY,
  CATEGORY_COLOR_PRESETS,
  useTaskCategories,
} from '../hooks/use-task-categories';
import {
  categoriesControllerCreate,
  categoriesControllerRemove,
  categoriesControllerUpdate,
} from '../lib/api-client';
import type { CategoryDto } from '../lib/api-client/models';

const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome deve ter no mínimo 2 caracteres.')
    .max(50, 'O nome deve ter no máximo 50 caracteres.'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Escolha uma cor válida (#RRGGBB).'),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

function getErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { detail?: string })?.detail ||
    (err as { message?: string })?.message ||
    fallback
  );
}

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const { categories, isLoading, isError, refetch } = useTaskCategories();

  // null = formulário fechado | 'new' = criando | CategoryDto = editando
  const [formTarget, setFormTarget] = useState<'new' | CategoryDto | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    // As tarefas exibem a categoria, então também precisam ser recarregadas
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: CategoryFormValues }) => {
      const res = id
        ? await categoriesControllerUpdate(id, data)
        : await categoriesControllerCreate(data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      setFeedback({
        type: 'success',
        message: variables.id
          ? `Categoria "${variables.data.name}" atualizada.`
          : `Categoria "${variables.data.name}" criada.`,
      });
      setFormTarget(null);
      invalidate();
    },
    onError: (err: unknown) => {
      setFeedback({ type: 'error', message: getErrorMessage(err, 'Não foi possível salvar a categoria.') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await categoriesControllerRemove(id);
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Categoria removida. As tarefas vinculadas ficaram sem categoria.' });
      invalidate();
    },
    onError: (err: unknown) => {
      setFeedback({ type: 'error', message: getErrorMessage(err, 'Falha ao excluir a categoria.') });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="h-6 w-6 text-blue-600" />
            Categorias de Tarefas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Organize suas tarefas por contexto (ex.: Faculdade, Trabalho, Pessoal) e filtre a lista por categoria.
          </p>
        </div>

        <Button onClick={() => setFormTarget('new')} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      {feedback && (
        <ActionFeedback type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />
      )}

      {formTarget && (
        <CategoryForm
          key={formTarget === 'new' ? 'new' : formTarget.id}
          category={formTarget === 'new' ? null : formTarget}
          isLoading={saveMutation.isPending}
          onCancel={() => setFormTarget(null)}
          onSubmit={(data) => {
            setFeedback(null);
            saveMutation.mutate({ id: formTarget === 'new' ? undefined : formTarget.id, data });
          }}
        />
      )}

      {isLoading ? (
        <LoadingState message="Carregando categorias..." />
      ) : isError ? (
        <ErrorState
          title="Erro ao buscar categorias"
          message="Não foi possível carregar as categorias no momento."
          onRetry={() => refetch()}
        />
      ) : categories.length === 0 ? (
        <EmptyState
          title="Nenhuma categoria criada"
          description="Crie categorias para agrupar suas tarefas."
          action={
            <Button size="sm" onClick={() => setFormTarget('new')}>
              Criar primeira categoria
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card key={category.id} className="shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <CategoryBadge name={category.name} color={category.color} className="text-sm" />
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      title="Editar categoria"
                      onClick={() => setFormTarget(category)}
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Excluir categoria"
                      isLoading={deleteMutation.isPending && deleteMutation.variables === category.id}
                      onClick={() => {
                        const warning =
                          category.taskCount > 0
                            ? `\n\n${category.taskCount} tarefa(s) ficarão sem categoria.`
                            : '';
                        if (confirm(`Deseja remover a categoria "${category.name}"?${warning}`)) {
                          deleteMutation.mutate(category.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <Link
                  to={`/tasks?categoryId=${category.id}`}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 dark:text-slate-400"
                >
                  <ListTodo className="h-3.5 w-3.5" />
                  {category.taskCount === 1 ? '1 tarefa' : `${category.taskCount} tarefas`} — ver na lista
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryForm({
  category,
  isLoading,
  onCancel,
  onSubmit,
}: {
  category: CategoryDto | null;
  isLoading: boolean;
  onCancel: () => void;
  onSubmit: (data: CategoryFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name ?? '',
      color: category?.color ?? CATEGORY_COLOR_PRESETS[0],
    },
  });

  const selectedColor = watch('color');
  const previewName = watch('name');

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {category ? 'Editar Categoria' : 'Nova Categoria'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Fechar formulário"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nome"
            placeholder="Ex.: Faculdade"
            {...register('name')}
            error={errors.name?.message}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Cor</span>
            <div className="flex flex-wrap items-center gap-2">
              {CATEGORY_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-label={`Usar cor ${preset}`}
                  onClick={() => setValue('color', preset, { shouldValidate: true })}
                  className="h-7 w-7 rounded-full flex items-center justify-center ring-offset-2 ring-offset-white dark:ring-offset-slate-900 transition"
                  style={{
                    backgroundColor: preset,
                    boxShadow: selectedColor?.toUpperCase() === preset ? `0 0 0 2px ${preset}` : undefined,
                  }}
                >
                  {selectedColor?.toUpperCase() === preset && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
              <input
                type="color"
                aria-label="Escolher cor personalizada"
                value={/^#[0-9A-Fa-f]{6}$/.test(selectedColor || '') ? selectedColor : '#3B82F6'}
                onChange={(e) => setValue('color', e.target.value.toUpperCase(), { shouldValidate: true })}
                className="h-7 w-10 cursor-pointer rounded border border-slate-300 dark:border-slate-700 bg-transparent"
              />
            </div>
            {errors.color?.message && <span className="text-xs text-red-500">{errors.color.message}</span>}
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              Prévia:
              <CategoryBadge name={previewName?.trim() || 'Categoria'} color={selectedColor || '#3B82F6'} />
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" isLoading={isLoading}>
                {category ? 'Salvar' : 'Criar Categoria'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
