import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CategoryDto,
  CreateCategoryDto,
  DEFAULT_CATEGORY_COLOR,
  ListCategoriesQueryDto,
  PaginatedCategoriesResponseDto,
  UpdateCategoryDto,
} from './category.dto';

interface UserContext {
  id: string;
  role: string;
}

// Conta apenas tarefas ativas (sem remoção lógica) vinculadas à categoria
const categoryInclude = {
  _count: {
    select: {
      tasks: { where: { deletedAt: null } },
    },
  },
} as const;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateCategoryDto): Promise<CategoryDto> {
    const name = dto.name.trim();
    await this.assertNameAvailable(ownerId, name);

    const created = await this.prisma.taskCategory.create({
      data: {
        name,
        color: (dto.color || DEFAULT_CATEGORY_COLOR).toUpperCase(),
        ownerId,
      },
      include: categoryInclude,
    });

    return this.serializeCategory(created);
  }

  async findAll(user: UserContext, query: ListCategoriesQueryDto): Promise<PaginatedCategoriesResponseDto> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { deletedAt: null };

    // Autorização: usuários comuns veem apenas as próprias categorias; ADMIN vê todas
    if (user.role !== 'ADMIN') {
      where.ownerId = user.id;
    }

    if (query.search) {
      where.name = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [total, items] = await Promise.all([
      this.prisma.taskCategory.count({ where }),
      this.prisma.taskCategory.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: categoryInclude,
      }),
    ]);

    return {
      data: items.map((item) => this.serializeCategory(item)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  async findById(user: UserContext, id: string): Promise<CategoryDto> {
    const category = await this.getAccessibleCategory(user, id, 'acessar');
    return this.serializeCategory(category);
  }

  async update(user: UserContext, id: string, dto: UpdateCategoryDto): Promise<CategoryDto> {
    const existing = await this.getAccessibleCategory(user, id, 'modificar');

    const name = dto.name !== undefined ? dto.name.trim() : undefined;
    if (name !== undefined && name.toLowerCase() !== existing.name.toLowerCase()) {
      await this.assertNameAvailable(existing.ownerId, name, id);
    }

    const updated = await this.prisma.taskCategory.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(dto.color !== undefined ? { color: dto.color.toUpperCase() } : {}),
      },
      include: categoryInclude,
    });

    return this.serializeCategory(updated);
  }

  async remove(user: UserContext, id: string): Promise<void> {
    await this.getAccessibleCategory(user, id, 'excluir');

    // Remoção lógica da categoria + desvinculação das tarefas numa única transação.
    // As tarefas não são apagadas: apenas ficam "sem categoria".
    await this.prisma.$transaction([
      this.prisma.task.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      }),
      this.prisma.taskCategory.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    ]);
  }

  private async getAccessibleCategory(user: UserContext, id: string, action: string) {
    const category = await this.prisma.taskCategory.findFirst({
      where: { id, deletedAt: null },
      include: categoryInclude,
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    if (user.role !== 'ADMIN' && category.ownerId !== user.id) {
      throw new ForbiddenException(`Você não tem permissão para ${action} esta categoria.`);
    }

    return category;
  }

  // Regra de negócio: um mesmo usuário não pode ter duas categorias ativas com o mesmo nome
  private async assertNameAvailable(ownerId: string, name: string, ignoreId?: string): Promise<void> {
    const duplicate = await this.prisma.taskCategory.findFirst({
      where: {
        ownerId,
        deletedAt: null,
        name: { equals: name, mode: 'insensitive' },
        ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
      },
    });

    if (duplicate) {
      throw new ConflictException(`Já existe uma categoria chamada "${name}".`);
    }
  }

  private serializeCategory(category: any): CategoryDto {
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      ownerId: category.ownerId,
      taskCount: category._count?.tasks ?? 0,
      createdAt: new Date(category.createdAt).toISOString(),
      updatedAt: new Date(category.updatedAt).toISOString(),
    };
  }
}
