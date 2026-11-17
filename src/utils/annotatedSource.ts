/**
 * Source listings carry `// @label` markers so steps can reference code by name
 * instead of fragile line numbers. Markers are stripped from the displayed source.
 */
export function parseAnnotatedSource(raw: string): { source: string; line: (label: string) => number[] } {
  const labels = new Map<string, number[]>()
  const out: string[] = []
  raw.split('\n').forEach((l, i) => {
    const m = l.match(/\s*(?:\/\/|#) @([\w-]+(?:\s+@[\w-]+)*)\s*$/)
    if (m) {
      for (const lab of m[1]!.split(/\s+@?/).filter(Boolean)) labels.set(lab, [...(labels.get(lab) ?? []), i + 1])
      out.push(l.slice(0, m.index))
    } else out.push(l)
  })
  return {
    source: out.join('\n'),
    line(label) {
      const r = labels.get(label)
      if (!r) throw new Error(`unknown code label @${label}`)
      return r
    },
  }
}
