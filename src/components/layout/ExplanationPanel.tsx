import { usePlayer } from '@/engine/state/playerStore'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 leading-relaxed">{children}</dd>
    </div>
  )
}

export function ExplanationPanel() {
  const step = usePlayer((s) => s.steps[s.playback.index])
  const index = usePlayer((s) => s.playback.index)
  if (!step) return <p className="p-4 text-muted">No step to show.</p>
  return (
    <article className="flex flex-col gap-3 p-4" aria-live="polite" aria-atomic="true">
      <header>
        <p className="font-mono text-[11px] text-muted">STEP {index + 1}{step.phase ? ` · ${step.phase}` : ''}</p>
        <h2 className="text-base font-semibold">{step.title}</h2>
      </header>
      <dl className="flex flex-col gap-3 text-[13px]">
        <Field label="What is happening">{step.explanation}</Field>
        <Field label="Why">{step.why}</Field>
        <Field label="Input"><code className="font-mono text-xs">{step.input}</code></Field>
        <Field label="Expected output"><code className="font-mono text-xs">{step.output}</code></Field>
      </dl>
    </article>
  )
}
