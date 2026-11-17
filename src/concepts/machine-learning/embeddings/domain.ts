/** Vector maths for the embeddings concept. Pure, deterministic, dependency-free. */

export type Vec = readonly number[]

export const dot = (a: Vec, b: Vec): number => a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0)
export const norm = (a: Vec): number => Math.sqrt(dot(a, a))
export const add = (a: Vec, b: Vec): number[] => a.map((x, i) => x + (b[i] ?? 0))
export const sub = (a: Vec, b: Vec): number[] => a.map((x, i) => x - (b[i] ?? 0))
export const scale = (a: Vec, k: number): number[] => a.map((x) => x * k)

/** cos θ = a·b / (‖a‖‖b‖). Undefined for zero vectors → 0 by convention here. */
export function cosine(a: Vec, b: Vec): number {
  const d = norm(a) * norm(b)
  return d === 0 ? 0 : dot(a, b) / d
}
export const euclidean = (a: Vec, b: Vec): number => norm(sub(a, b))
export const angleDeg = (cos: number): number => (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI

export type Metric = 'cosine' | 'euclidean'

export interface Ranked {
  word: string
  cosine: number
  euclidean: number
}

/** Nearest neighbours of `q` among `vocab` (excluding `exclude`), best first for `metric`. */
export function rank(q: Vec, vocab: Readonly<Record<string, Vec>>, metric: Metric, exclude: readonly string[] = []): Ranked[] {
  return Object.entries(vocab)
    .filter(([w]) => !exclude.includes(w))
    .map(([word, v]) => ({ word, cosine: cosine(q, v), euclidean: euclidean(q, v) }))
    .sort((x, y) => (metric === 'cosine' ? y.cosine - x.cosine : x.euclidean - y.euclidean) || x.word.localeCompare(y.word))
}

/* ---------------------------------------------------------------------- PCA */

export interface Pca {
  mean: number[]
  covariance: number[][]
  components: number[][] // k × d unit vectors, ordered by variance
  variances: number[]
  totalVariance: number
}

const matVec = (m: number[][], v: number[]) => m.map((row) => dot(row, v))

/** Deterministic PCA by power iteration with deflation (fine for tiny d; no randomness). */
export function pca(data: readonly Vec[], k: number): Pca {
  const n = data.length
  const d = data[0]!.length
  const mean = Array.from({ length: d }, (_, j) => data.reduce((s, r) => s + r[j]!, 0) / n)
  const centered = data.map((r) => r.map((x, j) => x - mean[j]!))
  const covariance = Array.from({ length: d }, (_, a) =>
    Array.from({ length: d }, (_, b) => centered.reduce((s, r) => s + r[a]! * r[b]!, 0) / (n - 1)),
  )
  const trace = covariance.reduce((s, row, i) => s + row[i]!, 0)
  const work = covariance.map((r) => [...r])
  const components: number[][] = []
  const variances: number[] = []
  for (let c = 0; c < Math.min(k, d); c++) {
    let v = Array.from({ length: d }, (_, i) => 1 + 0.137 * (i + 1) + 0.021 * c * i)
    v = scale(v, 1 / norm(v))
    for (let it = 0; it < 500; it++) {
      const w = matVec(work, v)
      const nw = norm(w)
      if (nw < 1e-14) break
      const next = scale(w, 1 / nw)
      const delta = norm(sub(next, v))
      v = next
      if (delta < 1e-13) break
    }
    // sign convention: largest-magnitude component positive
    const big = v.reduce((bi, x, i) => (Math.abs(x) > Math.abs(v[bi]!) ? i : bi), 0)
    if (v[big]! < 0) v = scale(v, -1)
    const lambda = dot(v, matVec(work, v))
    components.push(v)
    variances.push(lambda)
    for (let a = 0; a < d; a++) for (let b = 0; b < d; b++) work[a]![b]! -= lambda * v[a]! * v[b]!
  }
  return { mean, covariance, components, variances, totalVariance: trace }
}

export function project(p: Pca, v: Vec, k: number): number[] {
  const c = sub(v, p.mean)
  return p.components.slice(0, k).map((comp) => dot(c, comp))
}
