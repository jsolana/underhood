import { StepRecorder, type Highlight, type Simulation } from '@/engine/simulation/types'
import { listing } from './code'
import { add, angleDeg, cosine, dot, euclidean, norm, pca, project, rank, scale, sub, type Metric, type Ranked } from './domain'
import { DIMS, VOCAB } from './vocab'

export interface EmbeddingsInput {
  query: string
  other: string
  metric: Metric
  /** Factor applied to `other` in the scale-invariance step. */
  scale: number
  analogy: [string, string, string]
  /** 2-D toy vectors for the geometric intuition steps (draggable). */
  toy: { u: [number, number]; v: [number, number] }
  projection: 2 | 3
}

export type Stage = 'toy' | 'vector' | 'numbers' | 'pick' | 'dot' | 'norm' | 'cosine' | 'euclid' | 'scale' | 'rank' | 'analogy' | 'pca' | 'project' | 'reality'

export interface EmbeddingsState {
  stage: Stage
  toy: EmbeddingsInput['toy']
  query: string
  other: string
  scaled: number[] | null
  dot: number | null
  norms: [number, number] | null
  cosine: number | null
  angle: number | null
  euclid: number | null
  scaleResult: { k: number; cosine: number; euclid: number } | null
  ranking: Ranked[] | null
  metric: Metric
  analogy: { a: string; b: string; c: string; target: number[]; ranking: Ranked[]; metric: Metric } | null
  pca: { variances: number[]; ratio: number[]; covariance: number[][]; components: number[][] } | null
  points: { word: string; pos: number[] }[] | null
  projection: 2 | 3
}

const f = (x: number, d = 3) => x.toFixed(d)
const vec = (v: readonly number[]) => `[${v.map((x) => f(x, 2)).join(', ')}]`
const dimHighlights = (id: string, role: Highlight['role'] = 'active'): Highlight[] => DIMS.map((_, i) => ({ target: `${id}:${i}`, role }))

export const embeddingsSimulation: Simulation<EmbeddingsState, EmbeddingsInput> = {
  run(input) {
    const q = VOCAB[input.query]
    const o = VOCAB[input.other]
    if (!q || !o) throw new Error(`Unknown word: ${!q ? input.query : input.other}`)
    const [wa, wb, wc] = input.analogy
    const av = VOCAB[wa], bv = VOCAB[wb], cv = VOCAB[wc]
    if (!av || !bv || !cv) throw new Error('Analogy words must come from the vocabulary')

    const init: EmbeddingsState = {
      stage: 'toy', toy: input.toy, query: input.query, other: input.other, scaled: null, dot: null, norms: null, cosine: null, angle: null, euclid: null,
      scaleResult: null, ranking: null, metric: input.metric, analogy: null, pca: null, points: null, projection: input.projection,
    }
    const rec = new StepRecorder<EmbeddingsState>(init)
    const set = (p: Partial<EmbeddingsState>): EmbeddingsState => ({ ...rec.state, ...p })

    const { u, v } = input.toy
    const tc = cosine(u, v), td = euclidean(u, v)

    rec.push({
      title: 'Embeddings are points in space',
      explanation: `An embedding turns a thing (a word, sentence, image…) into a list of numbers, i.e. a point — equivalently an arrow from the origin — in a space where position carries meaning. Start with the smallest possible space: 2 dimensions. u = ${vec(u)} and v = ${vec(v)}. Drag them.`,
      why: 'Computers cannot compare meanings directly, but they can compare numbers. If training places similar things close together, “similar” becomes a geometric question.',
      input: `u=${vec(u)}, v=${vec(v)}`,
      output: 'two points / arrows in a 2-D plane',
      highlights: [{ target: 'pt:u', role: 'active' }, { target: 'pt:v', role: 'write' }],
      code: { lines: listing.line('vector') },
      phase: 'Intuition (2-D toy)', tags: ['toy'],
    }, set({ stage: 'toy' }))

    rec.push({
      title: 'Angle and cosine similarity (2-D)',
      explanation: `The angle between the arrows is ${f(angleDeg(tc), 1)}°, so cos θ = u·v / (‖u‖‖v‖) = ${f(dot(u, v))} / (${f(norm(u))} × ${f(norm(v))}) = ${f(tc)}. Cosine is 1 for the same direction, 0 for perpendicular and −1 for opposite directions. It ignores length.`,
      why: 'Direction is what embedding training tends to encode as meaning; vector length is often an artefact (frequency, document length…), so cosine is the default similarity.',
      input: `u=${vec(u)}, v=${vec(v)}`,
      output: `cosine = ${f(tc)}  (θ = ${f(angleDeg(tc), 1)}°)`,
      highlights: [{ target: 'pt:u', role: 'active' }, { target: 'pt:v', role: 'active' }],
      code: { lines: listing.line('cosine') },
      phase: 'Intuition (2-D toy)', tags: ['toy', 'cosine'],
    }, set({ cosine: tc, angle: angleDeg(tc), euclid: null }))

    rec.push({
      title: 'Euclidean distance (2-D)',
      explanation: `The straight-line distance between the two points is ‖u − v‖ = ${f(td)}. Unlike cosine it grows when you stretch a vector away from the origin even though its direction is unchanged — try dragging v outward along the same direction.`,
      why: 'Distance and angle answer different questions: “how far apart are the points?” vs. “do they point the same way?”. Which one is right depends on how the model was trained.',
      input: `u=${vec(u)}, v=${vec(v)}`,
      output: `euclidean = ${f(td)}`,
      highlights: [{ target: 'pt:u', role: 'active' }, { target: 'pt:v', role: 'active' }],
      code: { lines: listing.line('euclid') },
      phase: 'Intuition (2-D toy)', tags: ['toy', 'euclid'],
    }, set({ euclid: td }))

    rec.push({
      title: `A word as a vector: “${input.query}”`,
      explanation: `Real embeddings have many dimensions. In this lab every word has 6 hand-authored dimensions (${DIMS.join(', ')}). “${input.query}” is ${vec(q)}. Each number says how strongly the word expresses that dimension.`,
      why: 'A higher-dimensional vector can encode many properties at once. Similar words get similar numbers in many dimensions simultaneously.',
      input: `word = "${input.query}"`,
      output: `${DIMS.length}-D vector ${vec(q)}`,
      highlights: [{ target: 'vec:query', role: 'active' }],
      code: { lines: [...listing.line('vector'), ...listing.line('numbers')] },
      phase: 'Vectors', tags: ['vector'],
    }, set({ stage: 'vector', cosine: null, angle: null, euclid: null }))

    const strongest = q.map((x, i) => [Math.abs(x), i] as const).sort((x, y) => y[0] - x[0])[0]![1]
    rec.push({
      title: 'Numbers, not meanings',
      explanation: `The strongest dimension of “${input.query}” is “${DIMS[strongest]}” (${f(q[strongest]!, 2)}). ILLUSTRATIVE: here each axis has a name we invented. In a real model (768–3072 learned dimensions) no single axis has a human-readable meaning; meaning lives in the pattern across all of them.`,
      why: 'Being clear about this prevents the most common misconception: that you can read “royalty” off coordinate #37 of a real embedding.',
      input: `"${input.query}" = ${vec(q)}`,
      output: `dominant axis: ${DIMS[strongest]}`,
      highlights: [{ target: `vec:query:${strongest}`, role: 'match' }],
      code: { lines: listing.line('numbers') },
      phase: 'Vectors', tags: ['vector'],
    }, set({ stage: 'numbers' }))

    rec.push({
      title: `Pick a second word: “${input.other}”`,
      explanation: `We compare “${input.query}” ${vec(q)} with “${input.other}” ${vec(o)}. Comparing means doing arithmetic on these two lists of numbers, dimension by dimension.`,
      why: 'Every similarity measure is just a formula over two vectors of the same length.',
      input: `a = "${input.query}", b = "${input.other}"`,
      output: 'two vectors of equal dimension',
      highlights: [{ target: 'vec:query', role: 'active' }, { target: 'vec:other', role: 'write' }],
      code: { lines: listing.line('vector') },
      phase: 'Similarity', tags: ['compare'],
    }, set({ stage: 'pick' }))

    const d = dot(q, o)
    rec.push({
      title: 'Dot product',
      explanation: `Multiply matching dimensions and add: a·b = ${q.map((x, i) => `${f(x, 2)}×${f(o[i]!, 2)}`).join(' + ')} = ${f(d)}. Dimensions where both vectors are large and agree in sign contribute most.`,
      why: 'The dot product is the core operation of similarity search; cosine is just a normalised dot product.',
      input: `a=${vec(q)}, b=${vec(o)}`,
      output: `a·b = ${f(d)}`,
      highlights: dimHighlights('vec:query').concat(dimHighlights('vec:other', 'write')),
      code: { lines: listing.line('dot') },
      phase: 'Similarity', tags: ['dot'],
    }, set({ stage: 'dot', dot: d }))

    const na = norm(q), nb = norm(o)
    rec.push({
      title: 'Vector lengths (norms)',
      explanation: `‖a‖ = √Σaᵢ² = ${f(na)} and ‖b‖ = ${f(nb)}. The length is how far each point is from the origin.`,
      why: 'Dividing by the lengths removes magnitude so that only direction is compared.',
      input: `a=${vec(q)}, b=${vec(o)}`,
      output: `‖a‖=${f(na)}, ‖b‖=${f(nb)}`,
      highlights: [{ target: 'vec:query', role: 'active' }, { target: 'vec:other', role: 'write' }],
      code: { lines: listing.line('norm') },
      phase: 'Similarity', tags: ['norm'],
    }, set({ stage: 'norm', norms: [na, nb] }))

    const cs = cosine(q, o)
    rec.push({
      title: 'Cosine similarity',
      explanation: `cos θ = a·b / (‖a‖‖b‖) = ${f(d)} / (${f(na)} × ${f(nb)}) = ${f(cs)}, an angle of ${f(angleDeg(cs), 1)}°. ${cs > 0.8 ? 'Very similar direction.' : cs > 0.3 ? 'Moderately related.' : cs > -0.3 ? 'Nearly unrelated (close to perpendicular).' : 'Opposed.'}`,
      why: 'Cosine lies in [−1, 1] and is the usual yard-stick for text embeddings, where direction carries meaning.',
      input: `a·b=${f(d)}, ‖a‖=${f(na)}, ‖b‖=${f(nb)}`,
      output: `cosine = ${f(cs)}`,
      highlights: [{ target: 'vec:query', role: 'active' }, { target: 'vec:other', role: 'write' }],
      code: { lines: listing.line('cosine') },
      phase: 'Similarity', tags: ['cosine'],
    }, set({ stage: 'cosine', cosine: cs, angle: angleDeg(cs) }))

    const ed = euclidean(q, o)
    rec.push({
      title: 'Euclidean distance',
      explanation: `‖a − b‖ = √Σ(aᵢ−bᵢ)² = ${f(ed)}. Smaller means closer. For vectors of length 1 the two measures are linked: ‖a−b‖² = 2(1 − cos θ).`,
      why: 'Distance is natural when magnitude matters or in geometry-based indexes. After normalising vectors both give the same ranking.',
      input: `a=${vec(q)}, b=${vec(o)}`,
      output: `euclidean = ${f(ed)}`,
      highlights: dimHighlights('vec:query').concat(dimHighlights('vec:other', 'write')),
      code: { lines: listing.line('euclid') },
      phase: 'Similarity', tags: ['euclid'],
    }, set({ stage: 'euclid', euclid: ed }))

    const k = input.scale
    const sb = scale(o, k)
    const sc = cosine(q, sb), se = euclidean(q, sb)
    rec.push({
      title: `Stretch “${input.other}” by ×${k}`,
      explanation: `Multiplying b by ${k} keeps its direction but changes its length. cosine(a, ${k}·b) = ${f(sc)} (was ${f(cs)}) while the Euclidean distance becomes ${f(se)} (was ${f(ed)}).`,
      why: 'This is the practical difference between the metrics: cosine ignores magnitude, Euclidean does not. Pick the one your embedding model was trained for.',
      input: `b' = ${k} × b`,
      output: `cosine ${f(sc)} · euclidean ${f(se)}`,
      highlights: [{ target: 'vec:scaled', role: 'write' }, { target: 'vec:query', role: 'active' }],
      code: { lines: listing.line('scale') },
      phase: 'Similarity', tags: ['scale'],
    }, set({ stage: 'scale', scaled: sb, scaleResult: { k, cosine: sc, euclid: se } }))

    const ranking = rank(q, VOCAB, input.metric, [input.query])
    rec.push({
      title: `Nearest neighbours of “${input.query}”`,
      explanation: `Compute the similarity of “${input.query}” to every word and sort by ${input.metric}. Top results: ${ranking.slice(0, 3).map((r) => `${r.word} (${input.metric === 'cosine' ? f(r.cosine, 2) : f(r.euclidean, 2)})`).join(', ')}. This is what a vector database does, at scale and with approximate indexes.`,
      why: 'Semantic search, recommendation and retrieval-augmented generation all reduce to “find the nearest vectors to the query vector”.',
      input: `query="${input.query}", metric=${input.metric}, ${ranking.length} candidates`,
      output: `1st: ${ranking[0]!.word}`,
      highlights: ranking.slice(0, 3).map((r): Highlight => ({ target: `rank:${r.word}`, role: 'match' })),
      code: { lines: listing.line('rank') },
      phase: 'Search', tags: ['rank'],
    }, set({ stage: 'rank', ranking, metric: input.metric }))

    const target = add(sub(bv, av), cv)
    const ar = rank(target, VOCAB, input.metric, [wa, wb, wc])
    rec.push({
      title: `Analogy: ${wb} − ${wa} + ${wc}`,
      explanation: `Vector arithmetic: ${wb} ${vec(bv)} − ${wa} ${vec(av)} + ${wc} ${vec(cv)} = ${vec(target)}. The nearest word to that result (excluding the inputs) is “${ar[0]!.word}”. ${ar[0]!.word === 'queen' && wa === 'man' && wb === 'king' ? 'Subtracting “man” removes the male component and adding “woman” adds the female one.' : ''}`,
      why: 'Directions in the space can encode relations (gender, tense, capital-of…). Classic word2vec showed this only approximately and for some relations; the vectors here were hand-built so it works cleanly.',
      input: `${wb} − ${wa} + ${wc}`,
      output: `≈ ${ar[0]!.word}`,
      highlights: [{ target: `rank:${ar[0]!.word}`, role: 'match' }],
      code: { lines: listing.line('analogy') },
      phase: 'Semantic relations', tags: ['analogy'],
    }, set({ stage: 'analogy', analogy: { a: wa, b: wb, c: wc, target, ranking: ar, metric: input.metric } }))

    const words = Object.keys(VOCAB)
    const p = pca(words.map((w) => VOCAB[w]!), 3)
    const ratio = p.variances.map((x) => x / p.totalVariance)
    rec.push({
      title: 'Dimensionality reduction: PCA',
      explanation: `We cannot draw 6 dimensions, so we find the directions along which the words vary most. PCA centres the data, builds the 6×6 covariance matrix and takes its top eigenvectors. The first three explain ${f(ratio.reduce((a, b) => a + b, 0) * 100, 1)}% of the variance (${ratio.map((r) => f(r * 100, 1) + '%').join(', ')}).`,
      why: 'Projection onto few directions loses information. It is good for building intuition and bad for precise distances. Real models need this even more: 768+ dimensions → 2 or 3.',
      input: `${words.length} vectors × ${DIMS.length} dims`,
      output: `top-3 eigenvalues ${p.variances.map((x) => f(x, 3)).join(', ')}`,
      highlights: [],
      code: { lines: [...listing.line('center'), ...listing.line('cov'), ...listing.line('eig')] },
      phase: 'Visualising', tags: ['pca'],
    }, set({ stage: 'pca', pca: { variances: p.variances, ratio, covariance: p.covariance, components: p.components } }))

    const kdim = input.projection
    const raw = words.map((w) => ({ word: w, pos: project(p, VOCAB[w]!, kdim) }))
    const extent = Math.max(...raw.flatMap((r) => r.pos.map(Math.abs)), 1e-9)
    const points = raw.map((r) => ({ word: r.word, pos: r.pos.map((x) => (x / extent) * 1.0) }))
    rec.push({
      title: `Project to ${kdim}-D`,
      explanation: `Every word is projected onto the first ${kdim} principal components and plotted. Related words form clusters (people, animals, food, vehicles), and “${input.query}” sits near ${ranking[0]!.word}. ${kdim === 3 ? 'Drag to rotate.' : ''}`,
      why: 'Seeing clusters confirms that geometry reflects meaning — but remember distances in the plot are distorted compared with the original space.',
      input: `PCA components 1..${kdim}`,
      output: `${points.length} points in ${kdim}-D`,
      highlights: [{ target: `pt:${input.query}`, role: 'active' }, { target: `pt:${input.other}`, role: 'write' }, { target: `pt:${ranking[0]!.word}`, role: 'match' }],
      code: { lines: listing.line('project') },
      phase: 'Visualising', tags: ['project'],
    }, set({ stage: 'project', points, projection: kdim }))

    rec.push({
      title: 'Reality check: real embedding models',
      explanation: 'Everything here used 6 hand-made dimensions. Real models (word2vec 300-D, BERT-style 768-D, modern text-embedding models 1024–3072-D) learn their dimensions from data, so axes are not interpretable, analogies are noisy, and similarity is learned rather than defined. Visualisations like this one (PCA, t-SNE, UMAP) always distort distances.',
      why: 'High dimensions behave differently from 2-D or 3-D intuition: distances concentrate, and most directions are nearly orthogonal. That is why cosine similarity of real embeddings is often interpreted relative to other pairs, not as an absolute number.',
      input: 'illustrative 6-D vectors',
      output: 'understanding of what is and is not representative',
      highlights: [],
      phase: 'Perspective', tags: ['reality'],
    }, set({ stage: 'reality' }))

    return rec.build()
  },
}
