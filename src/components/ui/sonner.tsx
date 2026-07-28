'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
          '--success-bg': 'var(--color-success-wash)',
          '--success-text': 'var(--color-success)',
          '--success-border': 'var(--color-success)',
          '--warning-bg': 'var(--color-warning-wash)',
          '--warning-text': 'var(--color-warning)',
          '--warning-border': 'var(--color-warning)',
          '--error-bg': 'var(--color-error-wash)',
          '--error-text': 'var(--color-error)',
          '--error-border': 'var(--color-error)',
          '--info-bg': 'var(--color-info-wash)',
          '--info-text': 'var(--color-info)',
          '--info-border': 'var(--color-info)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
