-- Migration: 20260928_task_categories
-- Description: Categorias de tarefas por usuário (ownership + soft delete) e vínculo opcional Task -> TaskCategory

-- Consulta 001: Criação da tabela task_categories
CREATE TABLE "task_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "ownerId" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_categories_pkey" PRIMARY KEY ("id")
);

-- Consulta 002: Índices por dono e soft delete
CREATE INDEX "task_categories_ownerId_idx" ON "task_categories"("ownerId");
CREATE INDEX "task_categories_deletedAt_idx" ON "task_categories"("deletedAt");

-- Consulta 003: Foreign key relacionando a categoria ao perfil do usuário
ALTER TABLE "task_categories" ADD CONSTRAINT "task_categories_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Consulta 004: Coluna opcional de categoria na tabela tasks
ALTER TABLE "tasks" ADD COLUMN "categoryId" UUID;

-- Consulta 005: Índice e foreign key da categoria (remover a categoria desvincula as tarefas)
CREATE INDEX "tasks_categoryId_idx" ON "tasks"("categoryId");
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "task_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
