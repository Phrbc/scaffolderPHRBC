import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationMetaDto, PaginationQueryDto } from '../common/dto/pagination.dto';

export const CATEGORY_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
export const DEFAULT_CATEGORY_COLOR = '#3B82F6';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Nome da categoria', example: 'Faculdade', minLength: 2, maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'O nome da categoria deve ter no mínimo 2 caracteres.' })
  @MaxLength(50, { message: 'O nome da categoria deve ter no máximo 50 caracteres.' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Cor da categoria em hexadecimal (#RRGGBB)',
    example: '#10B981',
    default: DEFAULT_CATEGORY_COLOR,
  })
  @IsOptional()
  @IsString()
  @Matches(CATEGORY_COLOR_PATTERN, { message: 'A cor deve estar no formato hexadecimal #RRGGBB.' })
  color?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Nome da categoria', example: 'Trabalho', minLength: 2, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'O nome da categoria deve ter no mínimo 2 caracteres.' })
  @MaxLength(50, { message: 'O nome da categoria deve ter no máximo 50 caracteres.' })
  name?: string;

  @ApiPropertyOptional({ description: 'Cor da categoria em hexadecimal (#RRGGBB)', example: '#F59E0B' })
  @IsOptional()
  @IsString()
  @Matches(CATEGORY_COLOR_PATTERN, { message: 'A cor deve estar no formato hexadecimal #RRGGBB.' })
  color?: string;
}

export class CategoryDto {
  @ApiProperty({ description: 'Identificador único da categoria', example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  id!: string;

  @ApiProperty({ description: 'Nome da categoria', example: 'Faculdade' })
  name!: string;

  @ApiProperty({ description: 'Cor da categoria (#RRGGBB)', example: '#10B981' })
  color!: string;

  @ApiProperty({ description: 'Identificador do usuário proprietário', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  ownerId!: string;

  @ApiProperty({ description: 'Quantidade de tarefas ativas vinculadas à categoria', example: 3 })
  taskCount!: number;

  @ApiProperty({ description: 'Data de criação' })
  createdAt!: string;

  @ApiProperty({ description: 'Data de última atualização' })
  updatedAt!: string;
}

export class PaginatedCategoriesResponseDto {
  @ApiProperty({ description: 'Lista de categorias paginadas', type: [CategoryDto] })
  data!: CategoryDto[];

  @ApiProperty({ description: 'Metadados de paginação', type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class ListCategoriesQueryDto extends PaginationQueryDto {}
