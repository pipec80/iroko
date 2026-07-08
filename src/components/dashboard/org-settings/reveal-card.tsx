import { useState } from 'react';

type RevealCardProps = {
  title: string;
  description: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
  doneLabel: string;
  onDone: () => void;
};

/**
 * Muestra un secreto (API key / signing secret) UNA única vez, con copiar y
 * cerrar. Compartido por los tabs de API keys y Webhooks (F2-2D).
 */
export function RevealCard({
  title,
  description,
  value,
  copyLabel,
  copiedLabel,
  doneLabel,
  onDone,
}: RevealCardProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      className="card space-y-3 border p-6"
      style={{ borderColor: 'var(--color-cobalt)' }}
      role="alert">
      <div className="space-y-1">
        <h3 className="text-foreground text-[14px] font-semibold">{title}</h3>
        <p className="text-muted-foreground text-[12px]">{description}</p>
      </div>
      <code className="bg-background border-border text-foreground block overflow-x-auto rounded-lg border px-3 py-2 font-mono text-[12px] break-all">
        {value}
      </code>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => setCopied(true));
          }}
          className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-cobalt)' }}>
          {copied ? copiedLabel : copyLabel}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="border-border text-foreground rounded-lg border px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-80">
          {doneLabel}
        </button>
      </div>
    </div>
  );
}
