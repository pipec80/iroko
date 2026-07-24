import { cn } from '@/lib/utils';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-4">
      {steps.map((label, index) => (
        <li
          key={label}
          aria-current={index === current ? 'step' : undefined}
          className="flex items-center gap-2">
          <span
            className={cn(
              'flex size-6 items-center justify-center rounded-full text-xs font-medium',
              index < current && 'bg-primary text-on-primary',
              index === current && 'ring-primary ring-2',
              index > current && 'bg-surface-container-high text-on-surface-variant',
            )}>
            {index + 1}
          </span>
          <span className="text-sm">{label}</span>
        </li>
      ))}
    </ol>
  );
}
