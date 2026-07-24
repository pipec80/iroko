import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex w-full items-start">
      {steps.map((label, index) => (
        <li
          key={label}
          aria-current={index === current ? 'step' : undefined}
          className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                index < current && 'bg-primary text-primary-foreground',
                index === current && 'bg-primary/10 text-primary ring-primary ring-2',
                index > current && 'bg-muted text-muted-foreground',
              )}>
              {index < current ?
                <Check className="size-4" strokeWidth={3} />
              : index + 1}
            </span>
            <span
              className={cn(
                'hidden text-center text-xs font-medium whitespace-nowrap sm:block',
                index <= current ? 'text-foreground' : 'text-muted-foreground',
              )}>
              {label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                'mx-2 h-0.5 flex-1 rounded-full transition-colors',
                index < current ? 'bg-primary' : 'bg-border',
              )}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
