import type { ButtonHTMLAttributes } from 'react'

export function IconButton({ label, className = '', children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-line bg-raised px-2 text-xs text-fg transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...p}
    >
      {children}
    </button>
  )
}

export function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className="rounded-full border px-2 py-0.5 text-[11px] capitalize" style={{ borderColor: tone ?? 'var(--line)', color: tone ?? 'var(--muted)' }}>
      {children}
    </span>
  )
}
