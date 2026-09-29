import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CategoryBadgeProps {
  name: string;
  color: string;
  className?: string;
}

/**
 * Selo colorido de categoria. A cor vem do backend (#RRGGBB) e é aplicada com
 * transparência no fundo para funcionar tanto no tema claro quanto no escuro.
 */
export function CategoryBadge({ name, color, className }: CategoryBadgeProps) {
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 max-w-full px-2.5 py-0.5 rounded-full text-xs font-semibold border',
          className,
        ),
      )}
      style={{ backgroundColor: `${color}1A`, borderColor: `${color}66`, color }}
      title={`Categoria: ${name}`}
    >
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="truncate">{name}</span>
    </span>
  );
}
